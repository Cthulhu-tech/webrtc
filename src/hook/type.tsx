export interface RECEIVE_DISONECT {
    user: string
}
export type RECEIVE_CLIENT_JOINED = {
    user_server_id: string
}

export type peerConnectionType = { 
    [key:string]: RTCPeerConnection 
}

export interface RECEIVE_OFFER extends RECEIVE_DISONECT {
    offer: RTCSessionDescriptionInit
}

export interface RECEIVE_ANSWER extends RECEIVE_DISONECT {
    answer: RTCSessionDescriptionInit
}

export interface RECEIVE_ICE_CANDIDATE extends RECEIVE_DISONECT {
    candidate: RTCIceCandidateInit
}

export interface RECEIVE_OFFER extends RECEIVE_DISONECT {
    offer: RTCSessionDescriptionInit
}
