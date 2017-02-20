const Koa = require('koa');
const app = new Koa();
const server = require('http').createServer(app.callback());
const WebSocket = require('ws');
const wss = new WebSocket.Server({server});
const Router = require('koa-router');
const cors = require('koa-cors');
const bodyparser = require('koa-bodyparser');

app.use(bodyparser());
app.use(cors());
app.use(async function (ctx, next) {
    const start = new Date();
    await next();
    const ms = new Date() - start;
    console.log(`${ctx.method} ${ctx.url} ${ctx.response.status} - ${ms}ms`);
});

const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
};

const roomTypes = ['single', 'double', 'apartment', 'conference'];
const statusTypes = ['Available', 'Taken'];
const rooms = [];
for (let i = 0; i < 10; i++) {
    rooms.push({
        id: i + 1,
        name: "Room " + (i + 1),
        type: roomTypes[getRandomInt(0, roomTypes.length - 1)],
        status: statusTypes[0],
        size: i * 2
    });
}

const router = new Router();
router.get('/rooms', ctx => {
    ctx.response.body = rooms;
    ctx.response.status = 200;
});

router.get('/available', ctx => {
    ctx.response.body = rooms.filter(room => room.status === 'Available');
    ctx.response.status = 200;
});


const broadcast = (data) =>
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });

router.post('/add', ctx => {
    const headers = ctx.request.body;
    console.log("body: " + JSON.stringify(headers));
    const name = headers.name;
    const type = headers.type;
    const size = headers.size;
    if (typeof name != 'undefined' && typeof type != 'undefined' && typeof size != 'undefined') {
        const index = rooms.findIndex(room => room.name === name && room.type === type);
        if (index === -1) {
            let maxId = Math.max.apply(Math, rooms.map(function (room) {
                    return room.id;
                })) + 1;
            let room = {
                id: maxId,
                name,
                type,
                status: statusTypes[0],
                size
            };
            rooms.push(room);
            broadcast(room);
            ctx.response.body = room;
            ctx.response.status = 200;
        } else {
            ctx.response.body = {text: 'The room already exists'};
            ctx.response.status = 404;
        }
    } else {
        ctx.response.body = {text: 'Missing name, type and size fields'};
        ctx.response.status = 404;
    }
});

router.post('/delete', ctx => {
    const headers = ctx.request.body;
    console.log("body: " + JSON.stringify(headers));
    const id = headers.id;
    if (typeof id != 'undefined') {
        const index = rooms.findIndex(room => room.id === id);
        if (index === -1) {
            ctx.response.body = {text: 'Invalid id'};
            ctx.response.status = 404;
        } else {
            rooms.splice(index, 1);
            ctx.response.body = {text: 'The room was deleted'};
            ctx.response.status = 200;
        }
    } else {
        ctx.response.body = {text: 'Id missing'};
        ctx.response.status = 404;
    }
});

router.post('/update', ctx => {
    const headers = ctx.request.body;
    console.log("body: " + JSON.stringify(headers));
    const id = headers.id;
    const name = headers.name;
    const type = headers.type;
    const size = headers.size;
    if (typeof id != 'undefined' && typeof name != 'undefined' && typeof type != 'undefined' && typeof size != 'undefined') {
        const index = rooms.findIndex(room => room.id === id);
        if (index === -1) {
            ctx.response.body = {text: 'The room is missing'};
            ctx.response.status = 404;
        } else {
            let room = rooms[index];
            room.name = name;
            room.type = type;
            room.size = size;
            ctx.response.body = room;
            ctx.response.status = 200;
        }
    } else {
        ctx.response.body = {text: 'Missing id, name, type or size field'};
        ctx.response.status = 404;
    }
});


router.post('/book', ctx => {
    const headers = ctx.request.body;
    console.log("body: " + JSON.stringify(headers));
    const id = headers.id;
    if (typeof id != 'undefined') {
        const index = rooms.findIndex(room => room.id === id);
        if (index === -1) {
            ctx.response.body = {text: 'Invalid id'};
            ctx.response.status = 404;
        } else {
            let room = rooms[index];
            if (room.status != statusTypes[0]) {
                ctx.response.body = {text: 'The room is already taken'};
                ctx.response.status = 404;
            } else {
                room.status = statusTypes[1];
                ctx.response.body = room;
                ctx.response.status = 200;
            }
        }
    } else {
        ctx.response.body = {text: 'Id missing'};
        ctx.response.status = 404;
    }
});

router.post('/checkout', ctx => {
    const headers = ctx.request.body;
    console.log("body: " + JSON.stringify(headers));
    const id = headers.id;
    if (typeof id != 'undefined') {
        const index = rooms.findIndex(room => room.id === id);
        if (index === -1) {
            ctx.response.body = {text: 'Invalid id'};
            ctx.response.status = 404;
        } else {
            let room = rooms[index];
            room.status = statusTypes[0];
            ctx.response.body = room;
            ctx.response.status = 200;
        }
    } else {
        ctx.response.body = {text: 'Id missing'};
        ctx.response.status = 404;
    }
});


app.use(router.routes());
app.use(router.allowedMethods());

server.listen(3000);