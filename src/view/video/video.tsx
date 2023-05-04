import { io } from 'socket.io-client'
import { useEffect } from "react"

const socket = io('http://localhost:3001/', {
    withCredentials: true,
})

let peerConnections: { [key:string]: RTCPeerConnection } = {}

export const Video = () => {

    const createRTC = (user: string) => {
        const peerConnection = new RTCPeerConnection()
        peerConnection.onicecandidate = (e) => 
            socket.emit('SEND_ICE_CANDIDATE', {
                candidate: e.candidate,
                user,
            })
        
        navigator.mediaDevices
            .getUserMedia({
                audio: true,
                video: true,
            })
            .then((localStream) => {
                const video = document.createElement('video')
                video.srcObject = localStream
                const divVideo = document.querySelector('.video') as HTMLDivElement
                divVideo.append(video)
            })
        return peerConnection
    }

    useEffect(() => {
        socket.emit('JOIN_ROOM', { room_id: 8 })
        // клиент зашёл
        socket.on('RECEIVE_CLIENT_JOINED', ({ user_server_id }) => {
            const peerConnection = createRTC(user_server_id)
            peerConnection.createOffer()
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
                socket.emit('send answer', {
                    answer,
                    user
                })
            })
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
