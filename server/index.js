const http = require('http')
const express = require('express')
const { Server: SocketServer} = require('socket.io')
var os = require('os');
const fs = require('fs/promises')
const path = require('path')
const pty = require('node-pty')
const cors = require('cors')
const chokidar = require('chokidar');

var shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.env.INIT_CWD + './user',
    env: process.env
  });

const app = express()
const server = http.createServer(app);
const io = new SocketServer({
    cors: { origin: '*' }
});

app.use(cors())
io.attach(server);

chokidar.watch('./user').on('all', (event, path) => {
    io.emit('file:refresh', path);
  });

ptyProcess.onData(data => {
    io.emit('terminal:data', data)
})

io.on('connection', (socket) => { 
    console.log(`Socket connected`, socket.id);

    socket.emit('file:refresh')

    socket.on('file:change', async({ path, content}) => {
        await fs.writeFile(`./user${path}`,content)
    })

    socket.on('terminal:write', (data) => {
        ptyProcess.write(data);
    })
})

app.get('/files', async(req, res) => {
    const fileTree = await generateFileTree('./user');
    return res.json({tree: fileTree})
})

app.get('/files/content', async(req, res) => {
    const path = req.query.path;
    const content = await fs.readFile(`./user${path}`, 'utf-8');
    return res.json({content})
})

server.listen(9000, () => console.log('Server Running'))

async function generateFileTree(directory) {
    const tree = {}

    async function buildTree(currentDir, currentTree) {
        const files = await fs.readdir(currentDir);
        for (const file of files) {
            const filePath = path.join(currentDir, file);
            const stat = await fs.stat(filePath);
            if (stat.isDirectory()) {
                currentTree[file] = {};
                await buildTree(filePath, currentTree[file])
            } else {
                currentTree[file] = null;
            }
        }
    }
    await buildTree(directory, tree);
    return tree;
}