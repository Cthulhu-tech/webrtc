import { RECEIVE_ANSWER, RECEIVE_CLIENT_JOINED, RECEIVE_OFFER, RECEIVE_ICE_CANDIDATE, RECEIVE_DISONECT } from "./type"
import { useCallback, useEffect, useRef } from "react"
import { Socket } from "socket.io-client"

export const useWEBRTC = (socket: Socket) => {

    const mediaData = useRef<{ [key:string]: MediaStream }>({})
    const dataChannels= useRef<{ [key:string]: RTCDataChannel }>({})
    const peerConnections = useRef<{ [key:string]: RTCPeerConnection }>({})

    const createVideoStream = useCallback( async (peerConnection: RTCPeerConnection) => {
        const contains = await navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            const cams = devices.filter(device => device.kind === "videoinput")
            const constraints = { video: {}, audio: true }
            if(cams.length > 0)
                constraints.video = {
                    video: {
                        width: {
                            min: 320,
                            ideal: 1280,
                            max: 1920,
                        },
                        height: {
                            min: 240,
                            ideal: 720,
                            max: 1080,
                        },
                    },
                }
            else constraints.video = false

            return constraints
        })
        await navigator.mediaDevices
            .getUserMedia(contains)
                .then((stream) => {
                    stream.getTracks().forEach(track => {
                        console.log(track)
                        peerConnection.addTrack(track, stream)
                    })
                }).catch((error) => {
                    switch(error.message) {
                        case 'Requested device not found':
                            return console.log('Requested device not found')
                    }
                })
    }, [])

    const createRTC = (user: string) => {
        const peerConnection = new RTCPeerConnection(undefined)
        createVideoStream(peerConnection)
        peerConnection.ontrack = ({streams: [remoteStream]}) => mediaData.current[user] = remoteStream
        peerConnection.onicecandidate = (e) => 
            socket.emit('SEND_ICE_CANDIDATE', {
                candidate: e.candidate,
                user,
            })
        return peerConnection
    }

    useEffect(() => {
        socket.emit('JOIN_ROOM', { room_id: 8 })
        // клиент зашёл
        socket.on('RECEIVE_CLIENT_JOINED', ({ user_server_id }: RECEIVE_CLIENT_JOINED) => {
            const peerConnection = createRTC(user_server_id)
            const dataChannel = peerConnection.createDataChannel(user_server_id)
            dataChannel.onmessage = e => console.log(e.data)
            dataChannel.onopen = () => dataChannel.send('message')

            dataChannels.current[user_server_id] = dataChannel
            peerConnection.createOffer({
                offerToReceiveVideo: false,
                offerToReceiveAudio: true,
            })
            .then((offer) => {
                peerConnection.setLocalDescription(offer)
                socket.emit('SEND_OFFER', {
                    offer,
                    user: user_server_id,
                })
            })
            peerConnections.current[user_server_id] = peerConnection
        })
        // данные на подключение
        socket.on('RECEIVE_OFFER', ({ offer, user }: RECEIVE_OFFER) => {
            const peerConnection = createRTC(user)
            peerConnection.setRemoteDescription(offer)
            peerConnection.createAnswer()
            .then((answer) => {
                peerConnection.setLocalDescription(answer)
                socket.emit('SEND_ANSWER', {
                    answer,
                    user
                })
            })

            peerConnection.ondatachannel = (e) => {
                const dataChannel = e.channel
                dataChannel.onopen = () => dataChannel.send('message')
                dataChannel.onmessage = e => console.log(e.data)
                dataChannels.current[user] = dataChannel
            }
            peerConnections.current[user] = peerConnection
        })
        // данные на отправку к подключению
        socket.on('RECEIVE_ANSWER', ({ answer, user }: RECEIVE_ANSWER) => peerConnections.current[user].setRemoteDescription(answer))
        // отправить кандидатов
        socket.on('RECEIVE_ICE_CANDIDATE', ({ candidate, user }: RECEIVE_ICE_CANDIDATE) => peerConnections.current[user].addIceCandidate(candidate))
        // данные отключения
        socket.on('RECEIVE_DISONECT', ({ user }: RECEIVE_DISONECT) => {
            document.querySelector(`[data-user*=${user}]`)?.remove()
            if(peerConnections.current[user]) peerConnections.current[user].close()
            delete dataChannels.current[user]
            delete peerConnections.current[user]
        })

        return () => {
            socket.close()
            socket.off('RECEIVE_CLIENT_JOINED')
            socket.off('RECEIVE_OFFER')
            socket.off('RECEIVE_ANSWER')
            socket.off('RECEIVE_ICE_CANDIDATE')
            socket.off('RECEIVE_DISONECT')
        }
    },[socket])

    return { mediaData }
}