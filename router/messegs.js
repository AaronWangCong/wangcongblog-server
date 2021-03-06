const router = require('koa-router')();
const Utils = require('../utils');
const Tips = require('../utils/tip');
const db = require('../db');

//创建一个弹幕
router.post('/oa/messegsAdd',async (ctx,next)=>{
  let data = Utils.filter(ctx.request.body, ['msg','name']);
  let res = Utils.formatData(data, [
      {key: 'msg', type: 'string'},
      {key: 'name', type: 'string'}
  ]);
  if (!res) return ctx.body = Tips[1007];
  let {msg = '', name = '', create_time = '', random_color = '', top = 0, time = 0} = data;
  create_time = Utils.formatCurrentTime(create_time);
  random_color = Utils.randomColor(random_color);
  top = Math.floor(Math.random()*300+50);
  time = Math.floor(Math.random()*10+1);
  let sql = `INSERT INTO t_msg(msg,create_time,top,time,name,random_color) VALUES(?,?,?,?,?,?)`,
      value = [msg, create_time, top, time, name, random_color];
  await db.query(sql, value).then(res => {
        ctx.body = {
            ...Tips[0]
        }
    }).catch(() => {
        ctx.body = Tips[1002];
    })
});

//查询所有消息
router.get('/oa/noticeMessige', async (ctx, next) => {
    await db.query('SELECT * FROM t_msg').then(res => {
        if (res.length > 0) {
            ctx.body = {
                ...Tips[0],
                flag: true,
                rows: res
            };
        } else {
            ctx.body = Tips[1003];
        }
    }).catch(() => {
        ctx.body = Tips[1002];
    })
})

//添加首页滚屏通知
router.post('/oa/addnotice',async (ctx,next)=>{
    let data = Utils.filter(ctx.request.body, ['msg']);
    let res = Utils.formatData(data, [
        {key: 'msg', type: 'string'}
    ]);
    if (!res) return ctx.body = Tips[1007];
    let {msg = '', create_time = ''} = data;
    create_time = Utils.formatCurrentTime(create_time);
    let sql = `INSERT INTO t_notice(msg,create_time) VALUES(?,?)`,
        value = [msg, create_time];
    await db.query(sql, value).then(res => {
          ctx.body = {
              ...Tips[0]
          }
      }).catch(() => {
          ctx.body = Tips[1002];
      })
});
//查询首页滚屏通知
router.get('/oa/noticeInfo', async (ctx, next) => {
    await db.query('SELECT * FROM t_notice').then(res => {
        if (res.length > 0) {
            ctx.body = {
                ...Tips[0],
                rows: res
            };
        } else {
            console.log(res)
            ctx.body = Tips[1003];
        }
    }).catch(() => {
        console.log('1002',res)
        ctx.body = Tips[1002];
    })
})

module.exports = router;