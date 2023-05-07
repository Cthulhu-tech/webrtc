import { RECEIVE_ANSWER, RECEIVE_CLIENT_JOINED, RECEIVE_OFFER, RECEIVE_ICE_CANDIDATE, RECEIVE_DISONECT } from "./type"
import { useEffect, useRef } from "react"
import { Socket } from "socket.io-client"

export const meshRTC = (socket: Socket) => {

    const dataChannels = useRef<{ [key:string]: RTCDataChannel }>({})
    const peerConnections = useRef<{ [key:string]: RTCPeerConnection }>({})

    const getStream = async () => {
        const peerConnection = new RTCPeerConnection()
        const streams = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
        })
        streams.getTracks().forEach(track => peerConnection.addTrack(track, streams))
        // получить кандидатов
        socket.on('RECEIVE_ICE_CANDIDATE', ({ candidate, user }: RECEIVE_ICE_CANDIDATE) => peerConnections.current[user].addIceCandidate(new RTCIceCandidate(candidate)))
        // получить данные на отправку к подключению
        socket.on('RECEIVE_ANSWER', ({ answer, user }: RECEIVE_ANSWER) => peerConnections.current[user].setRemoteDescription(new RTCSessionDescription(answer)))
        // получить данные отключения
        socket.on('RECEIVE_DISONECT', ({ user }: RECEIVE_DISONECT) => {
            if(peerConnections.current[user]) peerConnections.current[user].close()
            delete dataChannels.current[user]
            delete peerConnections.current[user]
        })
        return peerConnection
    }

    useEffect(() => {

        socket.emit('JOIN_ROOM', { room_id: 8 })

        socket.on('RECEIVE_CLIENT_JOINED', async ({ user_server_id }: RECEIVE_CLIENT_JOINED) => {
            const peerConnection = await getStream()
            peerConnection.onicecandidate = (e) => 
                socket.emit('SEND_ICE_CANDIDATE', {
                    candidate: e.candidate,
                    user: user_server_id,
                })
            const dataChannel = peerConnection.createDataChannel(user_server_id)
            // message handler
            dataChannel.onmessage = e => console.log(e.data)
            // open connection handler
            dataChannel.onopen = () => dataChannel.send('Connection open!')
            //set data
            peerConnections.current[user_server_id] = peerConnection
            dataChannels.current[user_server_id] = dataChannel
            // create offer
            const offer = await peerConnection.createOffer()
            await peerConnection.setLocalDescription(offer)
            socket.emit('SEND_OFFER', {
                offer,
                user: user_server_id,
            })
        })

        socket.on('RECEIVE_OFFER', async ({ offer, user }: RECEIVE_OFFER) => {
            const peerConnection = await getStream()
            peerConnection.onicecandidate = (e) =>
                socket.emit('SEND_ICE_CANDIDATE', {
                    candidate: e.candidate,
                    user,
                })
            // set remote description
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
            // create answer
            const answer = await peerConnection.createAnswer()
            await peerConnection.setLocalDescription(answer)
            peerConnections.current[user] = peerConnection
            socket.emit('SEND_ANSWER', {
                answer,
                user
            })
            peerConnection.ondatachannel = (e) => {
                const dataChannel = e.channel
                dataChannel.onopen = () => dataChannel.send('Connection open!')
                dataChannel.onmessage = e => console.log(e.data)
                dataChannels.current[user] = dataChannel
            }
        })
        return () => {
            socket.close()
            socket.off('RECEIVE_OFFER')
            socket.off('RECEIVE_ANSWER')
            socket.off('RECEIVE_DISONECT')
            socket.off('RECEIVE_CLIENT_JOINED')
            socket.off('RECEIVE_ICE_CANDIDATE')
        }
    }, [socket])
}
