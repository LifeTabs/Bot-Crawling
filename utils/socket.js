import WebSocket from "ws";
import dotenv from "dotenv";
dotenv.config();
const ws = new WebSocket(process.env.WORKER_SOCKET_ENDPOINT);

const listenerWorker = (callback) => {
	ws.on("message", callback);
};



const sendToWorker = (json) => {
	ws.send(JSON.stringify(json));
};

export {
	sendToWorker,
	listenerWorker,
};