'use strict';
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const app = express();
app.disable('x-powered-by');
app.use(express.json({limit:'16kb'}));
app.use(express.static(path.join(__dirname, 'public'), {dotfiles:'deny'}));

const tasks = [
  {id:1,code:'1.1.1',title:'إعداد بطاقات الوصف الوظيفي',department:'التنظيم المؤسساتي',target:90,actual:78,period:'Q1',status:'قيد التنفيذ',owner:'نقطة اتصال التنظيم'},
  {id:2,code:'2.1.1',title:'تطوير مؤشرات الأداء',department:'التخطيط والإحصاء',target:70,actual:40,period:'Q1',status:'متعثر',owner:'نقطة اتصال التخطيط'},
  {id:3,code:'3.1.1',title:'تنفيذ البرامج التدريبية',department:'تنمية الموارد البشرية',target:60,actual:65,period:'Q2',status:'قيد التنفيذ',owner:'نقطة اتصال التدريب'},
  {id:4,code:'2.2.1',title:'إعداد تقرير نصف سنوي',department:'التخطيط والإحصاء',target:100,actual:100,period:'Q2',status:'مكتمل',owner:'نقطة اتصال التخطيط'},
  {id:5,code:'1.2.1',title:'مراجعة الإجراءات الإدارية',department:'التنظيم المؤسساتي',target:80,actual:45,period:'Q3',status:'متعثر',owner:'نقطة اتصال التنظيم'},
  {id:6,code:'2.3.1',title:'تجميع بيانات التقرير السنوي',department:'التخطيط والإحصاء',target:50,actual:15,period:'Q4',status:'قيد التنفيذ',owner:'نقطة اتصال التخطيط'}
];
const notifications = [
  {id:1,type:'warning',title:'موعد تحديث الإنجاز يقترب',message:'تذكير تجريبي بمراجعة تحديثات الفترة الحالية',read:false,createdAt:'2026-11-10T09:00:00Z'},
  {id:2,type:'info',title:'تحديث بانتظار التدقيق',message:'يوجد تحديث تجريبي يحتاج مراجعة',read:false,createdAt:'2026-11-10T08:00:00Z'},
  {id:3,type:'danger',title:'نشاط متعثر',message:'يرجى مراجعة الأنشطة المتعثرة في لوحة المتابعة',read:false,createdAt:'2026-11-09T12:00:00Z'}
];
const periods = [
  {code:'Q1',label:'الربع الأول',quarters:['Q1']},
  {code:'Q2',label:'الربع الثاني',quarters:['Q2']},
  {code:'Q3',label:'الربع الثالث',quarters:['Q3']},
  {code:'Q4',label:'الربع الرابع',quarters:['Q4']},
  {code:'H1',label:'النصف الأول',quarters:['Q1','Q2']},
  {code:'H2',label:'النصف الثاني',quarters:['Q3','Q4']},
  {code:'FY',label:'السنة كاملة',quarters:['Q1','Q2','Q3','Q4']}
];
const dbEnabled = Boolean(process.env.DB_HOST);
let pool;
function getPool(){
  if(!dbEnabled)return null;
  if(!pool)pool=mysql.createPool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,waitForConnections:true,connectionLimit:5,ssl:process.env.DB_SSL==='true'?{rejectUnauthorized:true}:undefined});
  return pool;
}
function demoWrite(req,res,next){
  if(dbEnabled)return res.status(403).json({error:'يتطلب التعديل تسجيل دخول وسير اعتماد غير متاح في النسخة التجريبية'});
  const origin=req.get('origin');
  if(origin){try{if(new URL(origin).host!==req.get('host'))return res.sendStatus(403)}catch(_){return res.sendStatus(403)}}
  next();
}
app.get('/api/health',async(_req,res)=>{try{const p=getPool();if(p)await p.query('SELECT 1');res.json({ok:true,mode:p?'mysql-readonly':'demo'})}catch(_){res.status(503).json({ok:false,error:'Database unavailable'})}});
app.get('/api/reporting-periods',(_req,res)=>res.json({items:periods}));
app.get('/api/tasks',async(_req,res)=>{try{const p=getPool();if(!p)return res.json({mode:'demo',items:tasks});const [rows]=await p.query('SELECT id,code,title,department,target,actual,period,status,owner FROM tasks ORDER BY id');res.json({mode:'mysql-readonly',items:rows})}catch(_){res.status(500).json({error:'Could not load tasks'})}});
app.post('/api/tasks/:id/progress',demoWrite,(req,res)=>{
  const id=Number(req.params.id),actual=req.body&&req.body.actual;
  if(!Number.isSafeInteger(id)||typeof actual!=='number'||!Number.isFinite(actual)||actual<0||actual>100)return res.status(400).json({error:'Invalid percentage'});
  const t=tasks.find(x=>x.id===id);if(!t)return res.sendStatus(404);
  t.actual=actual;t.status=actual===100?'مكتمل':actual<t.target-20?'متعثر':'قيد التنفيذ';
  res.json({ok:true,mode:'demo',item:t});
});
app.get('/api/notifications',(_req,res)=>res.json({mode:'demo',items:notifications}));
app.post('/api/notifications/:id/read',demoWrite,(req,res)=>{const id=Number(req.params.id);if(!Number.isSafeInteger(id))return res.sendStatus(400);const n=notifications.find(x=>x.id===id);if(!n)return res.sendStatus(404);n.read=true;res.json({ok:true,item:n})});
app.use('/api',(_req,res)=>res.sendStatus(404));
const port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';
app.listen(port,host,()=>console.log('Enjaz prototype at http://'+host+':'+port));
