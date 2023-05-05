import { io } from 'socket.io-client'
import { useEffect } from "react"

const socket = io('http://localhost:3001/', {
    withCredentials: true,
})

let dataChannels: { [key:string]: RTCDataChannel } = {}
let peerConnections: { [key:string]: RTCPeerConnection } = {}

export const Video = () => {

    const createRTC = (user: string) => {
        const videoContainer = document.querySelector('.video')
        const peerConnection = new RTCPeerConnection(undefined)
        peerConnection.onicecandidate = (e) => 
            socket.emit('SEND_ICE_CANDIDATE', {
                candidate: e.candidate,
                user,
            })
        navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
        }).then((stream) => {
            stream.getTracks().forEach(track => {
                const video = document.createElement('video')
                video.autoplay = true
                video.id = user
                video.srcObject = stream
                videoContainer?.append(video)
                peerConnection.addTrack(track, stream)
            })
        })
        peerConnection.ontrack = (event) => {
            const video = document.createElement('video')
            video.autoplay = true
            video.id = user
            const [remoteStream] = event.streams
            video.srcObject = remoteStream
            videoContainer?.append(video)
        }
        return peerConnection
    }

    useEffect(() => {
        socket.emit('JOIN_ROOM', { room_id: 8 })
        // клиент зашёл
        socket.on('RECEIVE_CLIENT_JOINED', ({ user_server_id }) => {
            const peerConnection = createRTC(user_server_id)
            const dataChannel = peerConnection.createDataChannel(user_server_id)
            dataChannel.onmessage = e => console.log(e.data)
            dataChannel.onopen = () => dataChannel.send('message')
            dataChannels[user_server_id] = dataChannel

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
            peerConnections[user_server_id] = peerConnection
        })
        // данные на подключение
        socket.on('RECEIVE_OFFER', ({ offer, user }) => {
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
                dataChannels[user] = dataChannel
            }

            peerConnections[user] = peerConnection
        })
        // данные на отправку к подключению
        socket.on('RECEIVE_ANSWER', ({ answer, user }) => peerConnections[user].setRemoteDescription(answer))
        // отправить кандидатов
        socket.on('RECEIVE_ICE_CANDIDATE', ({ candidate, user }) => peerConnections[user].addIceCandidate(candidate))
        // данные отключения
        socket.on('RECEIVE_DISONECT', ({ user }) => delete peerConnections[user])
    },[])

    return <div className='video'>
        
    </div>
}
