import { SocketContext } from "../../context/socketProvider"
import { useNavigate } from "react-router-dom"
import { useContext } from "react"

import { useWEBRTC } from '../../hook/useWEBRTC'

export const Video = () => {

    const navigate = useNavigate()
    const socket = useContext(SocketContext)
    const leaveHandler = () => navigate('/')

    const { mediaData } = useWEBRTC(socket)

    return <>
    <div className='video'>
        {Object.values(mediaData).map((_) => {
            return <video key={_} src={_} autoPlay/>
        })}
    </div>
    <button onClick={leaveHandler}>leave room</button>
    </>
    

}
