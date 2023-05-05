import React, { createContext, useMemo } from "react"
import { Socket, io } from "socket.io-client"

export const SocketContext = createContext<Socket>(io({
    autoConnect: false
}))

export const SocketProvider = ( props: {
        children: React.ReactNode,
    }) => {

    const socket = useMemo(() => io('http://localhost:3001/', {
        withCredentials: true,
        autoConnect: true,
    }), [])

  return <SocketContext.Provider value={socket}>
      {props.children}
    </SocketContext.Provider>
}
