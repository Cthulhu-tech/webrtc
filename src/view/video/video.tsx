import { io } from 'socket.io-client'
import { useEffect } from "react"

const socket = io('http://localhost:3001/', {
    withCredentials: true,
})

export const Video = () => {

    useEffect(() => {
        socket.emit('JOIN_ROOM', {
            room_id: 8,
            user_id: 5
        })
    },[])

    return <video id="localVideo" autoPlay playsInline />
}
