import { combineReducers, createStore } from "redux"
import { IStore } from "./type"

export const rootReducer = combineReducers<IStore>({

})

export const store = createStore(rootReducer)
