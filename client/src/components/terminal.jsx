import {Terminal as XTerminal} from '@xterm/xterm'
import { useEffect, useRef } from 'react'
import '@xterm/xterm/css/xterm.css'
import socket from '../socket'

const Terminal = () => {
    const terminalRef = useRef()
    const isRendered = useRef(false)
    useEffect(() => {
        if (isRendered.current) return;
        isRendered.current=true; 
        const term = new XTerminal({
            rows: 20,
        });
        term.open(terminalRef.current);
        term.onData((data) => {
            socket.emit("terminal:write", data)
        });
        function onTerminaldData(data) {
            term.write(data);
        }
        socket.on("terminal:data", onTerminaldData)

        // return() => {
        //     socket.off("terminal:data", onTerminaldData);
        // };
    },[]);

    return <div ref={terminalRef} id="terminal"/>
};

export default Terminal 