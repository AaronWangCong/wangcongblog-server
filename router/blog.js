const router = require('koa-router')();
const Utils = require('../utils');
const Tips = require('../utils/tip');
const db = require('../db/index');
const fs = require('fs');
const asyncBusboy = require('async-busboy');
const path = require('path');
//创建一篇博客，必须登录
router.post('/oa/user/addBlog', async (ctx, next) => {
    let data = Utils.filter(ctx.request.body, ['title', 'content', 'submit', 'category', 'create_time', 'author', 'uid'])
    let res = Utils.formatData(data, [
        {key: 'title', type: 'string'},
        {key: 'content', type: 'string'},
        {key: 'submit', type: 'string'},
        {key: 'category', type: 'string'},
        {key: 'author', type: 'string'},
        {key: 'uid', type: 'number'}
    ]);
    if (! res) return ctx.body = Tips[1007];
    let {title = '无标题', content = '', category = '', submit = '', create_time = '', author = '', uid = ''} = data;
    create_time = Utils.formatCurrentTime(create_time);
    let sql = `INSERT INTO t_article(title,content,submit,create_time,category, author, uid) VALUES (?,?,?,?,?,?,?)`,
        value = [title, content, submit, create_time, category, author, uid];
    await db.query(sql, value).then(async res => {
        ctx.body = {
            ...Tips[0],
            flag:true
        }
        
    }).catch(e => {
        console.log('value',value,res)
        ctx.body = Tips[1002];
    });
    
});

//查看博客所有tag标签
router.post('/oa/blog', async (ctx, next) => {
    let data = ctx.params;
    let res = Utils.formatData(data, [
        {key: 'category', type: 'string'}
    ]);
    if (! res) return ctx.body = Tips[1007];
    let {category} = data;
    let sql = `SELECT * from t_article where category=${category}`
    // let sql = `SELECT * FROM  t_article WHERE title=${title} OR category=${category} OR tag=${tag}`;
    await db.query(sql).then(res => {
        ctx.body = {
            ...Tips[0],
            rows: res
        }
        console.log(res)
    }).catch(e => {
        ctx.body = Tips[1002];
    })
});

//修改博客
router.post('/oa/user/modifyBlog', async (ctx, next) => {
    let data = Utils.filter(ctx.request.body, ['title', 'origin_tag_id', 'content', 'tag_id', 'note_id', 'id', 'brief', 'publish', 'create_time']),
        {uid} = ctx.state  || {};
    let res = Utils.formatData(data, [
        {key: 'note_id', type: 'number'},
        {key: 'id', type: 'number'},
        {key: 'title', type: 'string'},
        {key: 'brief', type: 'string'},
        {key: 'content', type: 'string'},
        {key: 'publish', type: 'number'}
    ]);
    if (! res) return ctx.body = Tips[1007];
    let {title, content, note_id, id, brief, publish = 0, create_time = ''} = data;
    create_time = Utils.formatCurrentTime(create_time);
    let sql = `UPDATE t_blog set title=?,content=?,note_id=?,brief=?,publish=?,create_time=? WHERE uid=? AND id=?;`,
        value = [title, content, note_id, brief, publish, create_time, uid, id];
    
    await db.query(sql, value).then(async res => {
        ctx.body = Tips[0];
    }).catch(e => {
        ctx.body = Tips[1002];
    })
    
});

//删除博客
router.post('/oa/user/removeBlog', async (ctx, next) => {
    let data = Utils.filter(ctx.request.body, ['id']), {uid} = ctx.state  || {};
    let res = Utils.formatData(data, [
        {key: 'id', type: 'number'}
    ]);
    if (! res) return ctx.body = Tips[1007];
    let {id} = data;
    let sql = 'UPDATE t_blog set is_delete=1 WHERE id=? AND uid=?', value = [id, uid];
    await db.query(sql, value).then(async res => {
        ctx.body = Tips[0];
    }).catch(e => {
        ctx.body = Tips[1002];
    });
});

//发布或上线博客
router.post('/oa/user/changeBlogStatus', async (ctx, next) => {
    let data = Utils.filter(ctx.request.body, ['id', 'publish']), uid = ctx.session.uid;
    let res = Utils.formatData(data, [
        {key: 'id', type: 'number'},
        {key: 'publish', type: 'number'}
    ]);
    if (! res) return ctx.body = Tips[1007];
    let {id, publish} = data;
    await db.query('UPDATE t_blog set publish=? WHERE uid=? AND id=?', [publish, uid, id]).then(res => {
        ctx.body = Tips[0];
    }).catch(e => {
        ctx.body = Tips[1002];
    })
})

//分页查询我所有的博客 type:0：我所有的 1 根据笔记本查询
router.get('/oa/user/myBlog', async (ctx, next) => {
    let data = Utils.filter(ctx.request.query, ['pageSize', 'pageNum', 'note_id', 'type']), {uid} = ctx.state  || {};
    let res = Utils.formatData(data, [
        {key: 'note_id', type: 'number'}
    ]);
    if (! res) return ctx.body = Tips[1007];
    let filterData = {};
    for (let i in data) {
        filterData[i] = parseInt(data[i])
    }
    let {pageSize = 15, pageNum = 1, note_id, type = 0} = filterData;
    let offset = (pageNum - 1) * pageSize, sql, sql1;
    if (+type === 1) {
        sql = `SELECT content,id,title,note_id,brief,create_time,update_time,publish  FROM  t_blog WHERE uid=${uid} AND note_id=${note_id} AND is_delete=0 ORDER BY create_time DESC limit ${offset},${pageSize};`;
        sql1 = `SELECT count(1) FROM  t_blog WHERE uid=${uid} AND note_id=${note_id} AND is_delete=0;`;
    } else {
        sql = `SELECT content,id,title,note_id,brief,create_time,update_time,publish  FROM  t_blog WHERE uid=${uid} AND is_delete=0 ORDER BY create_time DESC limit ${offset},${pageSize};`;
        sql1 = `SELECT count(1) FROM  t_blog WHERE uid=${uid} AND is_delete=0;`;
    }
    await db.query(sql1+sql).then(async result => {
        let res1 = result[0],res2 = result[1],total = 0,list = [];
        if(res1 && res1.length >0 && res2 && res2.length >0){
            total = res1[0]['count(1)'];
            list = res2;
        }
        ctx.body = {
            ...Tips[0],
            data: {
                list,
                pageSize,
                total
            }
        };
        
    }).catch(e => {
        ctx.body = Tips[1002];
    })
});
//查看博客详情
router.get('/oa/blog/:id', async (ctx, next) => {
    let data = ctx.params;
    let res = Utils.formatData(data, [
        {key: 'id', type: 'number'}
    ]);
    if (! res) return ctx.body = Tips[1007];
    let {id} = data;
    id = parseInt(id);
    let sql = `SELECT content,id,title,note_id,brief,create_time,publish  FROM t_blog WHERE id=${id} AND is_delete=0;`;
    await db.query(sql).then(res => {
        let detail = res[0] || [];
        if(detail.length >0){
            ctx.body = {...Tips[0],data:detail}
    
        }else{
            ctx.body = Tips[1003]
        }
    }).catch(e => {
        ctx.body = Tips[1002];
    })
});




//识别md文件
router.post('/oa/user/recognizeFile', async (ctx, next) => {
    try {
        let data = await asyncBusboy(ctx.req);
        let {files = []} = data;
        if (files.length > 0) {
            let file = files[0];
            let {path: filePath} = file;
            try {
                let content = fs.readFileSync(filePath, 'utf-8');
                fs.unlinkSync(filePath);//清除
                ctx.body = {
                    ...Tips[0],
                    flag: true,
                    obj: content
                }
            } catch (e) {
                ctx.body = Tips[1008];
            }
        } else {
            ctx.body = Tips[1008];
        }
    } catch (e) {
        ctx.body = Tips[1008];
    }
});
//添加修改一篇文章
router.post('/oa/user/modifyDoc', async (ctx, next) => {
    let data = Utils.filter(ctx.request.body, ['title', 'category', 'category_id', 'random_color', 'summary', 'content', 'imgUrl', 'mdContent', 'id']),
        {uid} = ctx.state  || {};
    let res = Utils.formatData(data, [
        {key: 'title', type: 'string'},
        {key: 'category', type: 'string'},
        {key: 'category_id', type: 'number'},
        {key: 'random_color', type: 'string'},
        {key: 'summary', type: 'string'},
        {key: 'content', type: 'string'},
        {key: 'imgUrl', type: 'string'},
        {key: 'mdContent', type: 'string'},
        {key: 'id', type: 'number'}
    ]);
    if (! res) return ctx.body = Tips[1007];
    let {title, category, category_id, random_color, summary, content, imgUrl, mdContent, id, create_time = ''} = data;
    create_time = Utils.formatCurrentTime(create_time);
    let sql = ``,
        value = []
    if (id) {
        sql = `UPDATE t_article set title=?,category=?,category_id=?,random_color=?,summary=?,content=?,imgUrl=?,mdContent=?,create_time=? WHERE id=?;`;
        value = [title, category, category_id, random_color, summary, content, imgUrl, mdContent, create_time, id];
    } else {
        sql = `INSERT INTO t_article(title,category,category_id,random_color,summary,content,imgUrl,mdContent,create_time) VALUES (?,?,?,?,?,?,?,?,?)`;
        value = [title, category, category_id, random_color, summary, content, imgUrl, mdContent, create_time];
    }
    await db.query(sql, value).then(async res => {
        ctx.body = {
            ...Tips[0],
            flag:true
        }
    }).catch(e => {
        ctx.body = Tips[1002];
    })
    
});

//删除文章
router.post('/oa/user/removeDoc', async (ctx, next) => {
    let data = Utils.filter(ctx.request.body, ['id']);
    let res = Utils.formatData(data, [
        {key: 'id', type: 'number'}
    ]);
    if (! res) return ctx.body = Tips[1007];
    let {id} = data;
    let sql = 'UPDATE t_article set is_delete=1 WHERE id=?', value = [id];
    await db.query(sql, value).then(async res => {
        ctx.body = Tips[0];
    }).catch(e => {
        ctx.body = Tips[1002];
    });
});

//查询文章列表
router.post('/oa/articleList', async (ctx, next) => {
    let data = Utils.filter(ctx.request.body, ['category', 'keywords','pagingDto'])
    let res = Utils.formatData(data, [
        {key: 'category', type: 'string'},
        {key: 'keywords', type: 'string'},
        {key: 'pagingDto', type: 'object'}
    ]);
    let sql = ``,
        sql1 = ``;
    let {category, keywords, pagingDto} = data;
    let {pageNo, pageSize} = pagingDto;
    let offset = (pageNo - 1) * pageSize;
    if (! res || (! category && ! keywords)) {
        sql = `SELECT * FROM t_article WHERE is_delete=0 ORDER BY create_time DESC limit ${offset},${pageSize};`;
        sql1 = `SELECT count(1) FROM  t_article WHERE is_delete=0 ORDER BY create_time DESC`;
    } else if (category && ! keywords) {
        sql = `SELECT * FROM t_article WHERE is_delete=0 AND category=${JSON.stringify(category)} ORDER BY create_time DESC limit ${offset},${pageSize};`;
        sql1 = `SELECT count(1) FROM  t_article WHERE is_delete=0 AND category=${JSON.stringify(category)} ORDER BY create_time DESC`;
    } else if (! category && keywords) {
        sql = `SELECT * FROM t_article WHERE is_delete=0 AND title LIKE "%${keywords}%" ORDER BY create_time DESC limit ${offset},${pageSize};`;
        sql1 = `SELECT count(1) FROM t_article WHERE is_delete=0 AND title LIKE "%${keywords}%" ORDER BY create_time DESC`;
    }
    await db.query(sql+sql1).then(async result => {
        let res1 = result[0],res2 = result[1],total = 0,list = [];
        if(res1 && res1.length >0 && res2 && res2.length >0){
            total = res2[0]['count(1)'];
            list = res1;
        }
        ctx.body = {
            ...Tips[0],
            flag:true,
            rows: list,
            pageSize,
            total
        }
    }).catch(() => {
        ctx.body = Tips[1002];
    })
})

//上一条 下一条
router.get('/oa/articleListUpDown/:id', async (ctx, next) => {
    let data = ctx.params;
    let res = Utils.formatData(data, [
        {key: 'id', type: 'number'}
    ]);
    if (! res) return ctx.body = Tips[1007];
    let {id} = data;
    id = parseInt(id);
    let sql = `SELECT id,category,title FROM t_article WHERE is_delete=0 AND id IN((SELECT id FROM t_article WHERE id<${id} ORDER BY id DESC LIMIT 1),(SELECT id FROM t_article WHERE is_delete=0 AND id>${id} ORDER BY id LIMIT 1)) ORDER BY id`;
    await db.query(sql).then(res => {
        if(res && res.length >0){
            ctx.body = {
                ...Tips[0],
                flag:true,
                rows: res
            }
        } else {
            ctx.body = {
                ...Tips[1003],
                flag:false,
                rows: []
            }
        }
    }).catch(() => {
        ctx.body = Tips[1002];
    })
})

//查询文章详情
router.get('/oa/articleList/:id', async (ctx, next) => {
    let data = ctx.params;
    let res = Utils.formatData(data, [
        {key: 'id', type: 'number'}
    ]);
    if (! res) return ctx.body = Tips[1007];
    let {id} = data;
    id = parseInt(id);
    let sql = `SELECT * FROM t_article WHERE is_delete=0 AND id=${id}`;
    await db.query(sql).then(res => {
        let detail = res[0] || [];
        if(detail){
            ctx.body = {...Tips[0],obj:detail}
            rows: []
        }else{
            ctx.body = Tips[1003]
        }
    }).catch(e => {
        ctx.body = Tips[1002];
    })
});

//文章中的图片
router.post('/oa/user/upimgFiles', async (ctx, next) => {
    try {
        let data = await asyncBusboy(ctx.req)
        let { files = [] } = data;
        if(files.length === 0) return ctx.body = Tips[1002];
        let file = files[0];
        let { mimeType = '', filename, path: filepath } = file;
        if(mimeType.indexOf('image') === -1) return ctx.body = Tips[1002];
        let name = Date.now() + '.' + filename.split('.').pop();
        
        // 创建可读流
        const reader = fs.createReadStream(file['path']);
        
        let savePath = path.join(__dirname, `../../media/articleImg/${name}`);
        let remotefilePath = `http://media.wangcong.wang/articleImg/` + `${name}`;
        // 创建可写流
        const upStream = fs.createWriteStream(savePath);
        // 可读流通过管道写入可写流
        reader.pipe(upStream);
        let imgurl = remotefilePath
        let create_time = ''
        create_time = Utils.formatCurrentTime(create_time);
        let sql = `INSERT INTO t_articleImg(imgurl,create_time) VALUES (?,?)`
        let value = [imgurl, create_time]
        try {
            await db.query(sql, value).then(async res => {
                ctx.body = {
                    ...Tips[0],
                    flag: true,
                    data: { remotefilePath }
                }
            }).catch(e => {
                ctx.body = Tips[1002];
            });
        } catch (e) {
            ctx.body = Tips[1005];
        }
    } catch (e) {
        ctx.body = Tips[1002];
    }
});

//文章封面
router.post('/oa/user/articleUpimgFiles', async (ctx, next) => {
    try {
        let data = await asyncBusboy(ctx.req)
        let { files = [] } = data;
        if(files.length === 0) return ctx.body = Tips[1002];
        let file = files[0];
        let { mimeType = '', filename, path: filepath } = file;
        if(mimeType.indexOf('image') === -1) return ctx.body = Tips[1002];
        let name = Date.now() + '.' + filename.split('.').pop();
        
        // 创建可读流
        const reader = fs.createReadStream(file['path']);
        
        let savePath = path.join(__dirname, `../../media/articleLogo/${name}`);
        let remotefilePath = `http://media.wangcong.wang/articleLogo/` + `${name}`;
        // 创建可写流
        const upStream = fs.createWriteStream(savePath);
        // 可读流通过管道写入可写流
        reader.pipe(upStream)
        let imgurl = remotefilePath
        let create_time = ''
        create_time = Utils.formatCurrentTime(create_time);
        let sql = `INSERT INTO t_articleLogo(imgurl,create_time) VALUES (?,?)`
        let value = [imgurl, create_time]
        try {
            await db.query(sql, value).then(async res => {
                ctx.body = {
                    ...Tips[0],
                    flag: true,
                    data: { remotefilePath }
                }
            }).catch(e => {
                ctx.body = Tips[1002];
            });
        } catch (e) {
            ctx.body = Tips[1005];
        }
    } catch (e) {
        ctx.body = Tips[1002];
    }
});

//添加修改分类
router.post('/oa/user/modifyCategory', async (ctx, next) => {
    let data = Utils.filter(ctx.request.body, ['category_name', 'category_id'])
    let res = Utils.formatData(data, [
        {key: 'category_name', type: 'string'},
        {key: 'category_id', type: 'number'}
    ]);
    if (! res) return ctx.body = Tips[1007];
    let {category_name, category_id, create_time = '', random_color = ''} = data;
    create_time = Utils.formatCurrentTime(create_time);
    random_color = Utils.randomColor(random_color);
    let sql = ``,
        value = []
    if (category_id) {
        sql = `UPDATE t_category set category_name=?,create_time=? WHERE category_id=?;`;
        value = [category_name, create_time, category_id];
    } else {
        sql = `INSERT INTO t_category(category_name,create_time,random_color) VALUES (?,?,?)`;
        value = [category_name, create_time, random_color];
    }
        
    await db.query(sql, value).then(async res => {
        ctx.body = {
            ...Tips[0],
            flag:true
        }
    }).catch(e => {
        ctx.body = Tips[1002];
    })
    
});

//查询分类
router.get('/oa/category', async (ctx, next) => {
    await db.query('SELECT * FROM t_category').then(res => {
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

//查询文章封面图片及详情图
router.post('/oa/articleImg', async (ctx, next) => {
    let data = Utils.filter(ctx.request.body, ['imgtype','pagingDto'])
    let res = Utils.formatData(data, [
        {key: 'imgtype', type: 'string'},
        {key: 'pagingDto', type: 'object'}
    ]);
    if (! res) return ctx.body = Tips[1007];
    let {imgtype, pagingDto} = data;
    let {pageNo, pageSize} = pagingDto;
    let offset = (pageNo - 1) * pageSize;
    let sql = ``
    if (imgtype && imgtype === 'logo') {
        sql = `SELECT * FROM t_articleLogo WHERE is_delete=0 ORDER BY create_time DESC limit ${offset},${pageSize};`
    } else {
        sql = `SELECT * FROM t_articleImg WHERE is_delete=0 ORDER BY create_time DESC limit ${offset},${pageSize};`
    }
    await db.query(sql).then(res => {
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

module.exports = router;