import { SocketContext } from "../../context/socketProvider"
import { useNavigate } from "react-router-dom"
import { useContext } from "react"

import { meshRTC } from '../../hook/meshRTC'

export const Video = () => {

    const navigate = useNavigate()
    const socket = useContext(SocketContext)
    const leaveHandler = () => navigate('/')

    meshRTC(socket)

    return <>
    <div className='video'>

    </div>
    <button onClick={leaveHandler}>leave room</button>
    </>
    

}
