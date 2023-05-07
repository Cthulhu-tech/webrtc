import { RECEIVE_ANSWER, RECEIVE_CLIENT_JOINED, RECEIVE_OFFER, RECEIVE_ICE_CANDIDATE, RECEIVE_DISONECT, peerConnectionType } from "./type"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Socket } from "socket.io-client"

export const useMeshRTC = (socket: Socket) => {

    const peerConnections = useRef<peerConnectionType>({})
    const [connections, setConections] = useState<peerConnectionType>({})

    const offerOptions = useMemo(() => {
        return {
            offerToReceiveVideo: true,
            offerToReceiveAudio: true 
        }
    },[])

    const updateRef = useCallback((newData: peerConnectionType) => {
        peerConnections.current = {...peerConnections.current, ...newData}
        setConections(peerConnections.current)
    },[])

    const getContains = useCallback(() => {
        return navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            const cams = devices.filter(device => device.kind === "videoinput")
            const constraints = { video: {}, audio: true }
            if(cams.length > 0)
                constraints.video = {
                    video: {
                        width: {
                          min: 0,
                          ideal: 1920,
                          max: 2560,
                        },
                        height: {
                          min: 0,
                          ideal: 1080,
                          max: 1440,
                        },
                        facingMode: 'user',
                    },
                }
            else constraints.video = false

            return constraints
        })
    }, [])

    const userJoin = useCallback(async (localVideo: HTMLVideoElement) => {
        navigator.mediaDevices
            .getUserMedia(await getContains())
            .then((stream) => {
                if(localVideo?.srcObject) localVideo.srcObject = stream
            })
    }, [socket])

    const getStream = async (peerConnection: RTCPeerConnection) => {
        const streams = await navigator.mediaDevices.getUserMedia(await getContains())
        await Promise.all(streams.getTracks().map(track => peerConnection.addTrack(track, streams)))
    }
    const initiateSignaling = async ( peerConnection: RTCPeerConnection, user: string) => {
        await peerConnection.createOffer(offerOptions)
        .then(async (offer) => {
                await peerConnection.setLocalDescription(offer)
                console.log(`send offer to ${user}`)
                socket.emit('SEND_OFFER', { offer, user })
            },
            err => {
                if (err) throw err
            })
    }
    const createRTC = async (user: string) => {
        const peerConnection = new RTCPeerConnection()
        updateRef({ [user]: peerConnection})
        await getStream(peerConnection)
        peerConnection.onicecandidate = ({ candidate }) => {
            if (candidate) {
                console.log(`send ice candidate to ${user}`)
                socket.emit('SEND_ICE_CANDIDATE', { candidate, user })
            }
        }
        return peerConnection
    }
    const sendAnswer = async (offer: RTCSessionDescriptionInit, peerConnection: RTCPeerConnection, user: string) => {
        await peerConnection.setRemoteDescription(offer)
        peerConnection.createAnswer()
            .then(async (answer) => {
                await peerConnection.setLocalDescription(answer)
                console.log(`send answer to ${user}`)
                socket.emit('SEND_ANSWER', { answer, user })
            }, (err) => {
                if (err) throw err;
            })
    }
    useEffect(() => {
        socket.emit('JOIN_ROOM', { room_id: 8 })
        socket.on('RECEIVE_CLIENT_JOINED', async ({ user_server_id }: RECEIVE_CLIENT_JOINED) => {
            const peerConnection = await createRTC(user_server_id)
            await initiateSignaling(peerConnection, user_server_id)
        })
        socket.on('RECEIVE_OFFER', async ({ offer, user }: RECEIVE_OFFER) => {
            console.log(`receive offer from ${user}`)
            const peerConnection = await createRTC(user)
            sendAnswer(offer, peerConnection, user)
        })
        // получить данные на отправку к подключению
        socket.on('RECEIVE_ANSWER', ({ answer, user }: RECEIVE_ANSWER) => {
            console.log(`receive answer from ${user}`)
            peerConnections.current[user].setRemoteDescription(answer)
        })
        // получить кандидатов
        socket.on('RECEIVE_ICE_CANDIDATE', ({ candidate, user }: RECEIVE_ICE_CANDIDATE) => {
            console.log(`receive ice candidate from ${user}`)
            peerConnections.current[user].addIceCandidate(candidate)
        })
        // получить данные отключения
        socket.on('RECEIVE_DISONECT', ({ user }: RECEIVE_DISONECT) => {
            console.log(`client leave ${user}`)
            delete peerConnections.current[user]
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

    const videoView = useCallback((connection: RTCPeerConnection, entity: HTMLVideoElement) => {
        connection.ontrack = e => {
            entity.autoplay = true
            entity.srcObject = e.streams[0]
        }
    }, [])

    return { connections, videoView, userJoin }
}
