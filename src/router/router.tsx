import { createBrowserRouter } from "react-router-dom"
import { Create } from "../view/create/create"
import { Video } from "../view/video/video"

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Create/>
    },
    {
        path: '/video',
        element: <Video/>
    }
])
