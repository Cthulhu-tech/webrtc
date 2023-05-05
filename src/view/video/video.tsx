import { SocketContext } from "../../context/socketProvider"
import { useNavigate } from "react-router-dom"
import { useContext } from "react"

import { useWEBRTC } from '../../hook/useWEBRTC'

export const Video = () => {

    const navigate = useNavigate()
    const socket = useContext(SocketContext)
    const leaveHandler = () => navigate('/')

    const { peerConnections, videoState } = useWEBRTC(socket)

    return <>
    <div className='video'>
        <div>
        {Object.values(peerConnections.current)?.map((_) => 
            <video
                key={_.remoteDescription?.sdp}
                ref={
                    (instace) => {
                        videoState(instace, _)
                    }
                }
                autoPlay
            />)}
        </div>
    </div>
    <button onClick={leaveHandler}>leave room</button>
    </>
    

}
