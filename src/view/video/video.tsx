import { SocketContext } from "../../context/socketProvider"
import { useNavigate } from "react-router-dom"
import { useContext } from "react"

import { useMeshRTC } from '../../hook/meshRTC'

export const Video = () => {

    const navigate = useNavigate()
    const socket = useContext(SocketContext)
    const leaveHandler = () => navigate('/')

    const { connection, videoView } = useMeshRTC(socket)
    return <>
    <div className='video'>
        {Object.entries(connection).map((connectArray) => {
            return <video 
                    key={connectArray[0]}
                    ref={reference => reference && videoView(connectArray[1], reference)}
                ></video>
        })}
    </div>
    <button onClick={leaveHandler}>leave room</button>
    </>
    

}
