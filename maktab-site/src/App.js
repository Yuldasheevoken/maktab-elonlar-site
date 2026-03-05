import React from "react";
import { useReducer, useCallback, useEffect, useRef } from "react";

const SINFLAR = ["5-sinf","6-sinf","7-sinf","8-sinf","9-sinf","10-sinf","11-sinf"];
const GAMES = ["PUBG","Brawl Stars","Mobile Legends","Free Fire","Clash of Clans","Dream League Soccer (DLS)"];
const TC = { reklamalar:"#6366f1", elonlar:"#10b981", akkauntlar:"#f59e0b", yoqolgan:"#ef4444" };
const TL = { reklamalar:"Reklama", elonlar:"Elon", akkauntlar:"Akkaunt", yoqolgan:"Yoqolgan" };

let _uid = Date.now();
const uid = () => (++_uid).toString(36);
const fmt = n => Number(n).toLocaleString("uz-UZ") + " som";
const ago = ts => {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return "Hozirgina";
  if (d < 3600) return Math.floor(d/60) + " daq oldin";
  if (d < 86400) return Math.floor(d/3600) + " soat oldin";
  return Math.floor(d/86400) + " kun oldin";
};
const avgR = u => u && u.ratings && u.ratings.length
  ? (u.ratings.reduce((s,r) => s + r.score, 0) / u.ratings.length).toFixed(1) : "-";

const DEFAULT_USERS = [
  { id:"u_owner",     name:"Katta Admin", email:"15-maktabA-Za1@maktab.uz", password:"admin123",  role:"owner",     blocked:false, ratings:[], createdAt:Date.now()-864e5*10 },
  { id:"u_moderator", name:"Moderator",   email:"Elonlaradmini@gmail.uz",    password:"admin456",  role:"moderator", blocked:false, ratings:[], createdAt:Date.now()-864e5*8  },
];

const INIT = {
  user:null, users:DEFAULT_USERS,
  listings:[], bids:{}, payments:[], messages:[], reports:[], comments:{}, middleman:[], images:{},
  page:"home", filter:"all", classFilter:"all", search:"",
  selectedId:null, chatWithId:null,
  adminTab:"pending", helperTab:"pending", msgTab:"chats",
  toast:null, lightbox:null, loading:true,
  authForm:{name:"",email:"",password:"",confirm:""},
  lForm:{type:"reklamalar",title:"",desc:"",price:"",category:"",sinf:"",auction:false,auctionEnd:""},
  lImages:[], bidInput:"", msgInput:"", rScore:5, rComment:"", commentInput:{},
};

function reducer(s, a) {
  switch(a.t) {
    case "SET":    return {...s,[a.k]:a.v};
    case "PATCH":  return {...s,...a.v};
    case "AF":     return {...s,authForm:{...s.authForm,[a.k]:a.v}};
    case "LF":     return {...s,lForm:{...s.lForm,[a.k]:a.v}};
    case "RLF":    return {...s,lForm:INIT.lForm,lImages:[]};
    case "LOAD":   return {...s,...a.data,loading:false};
    case "TOAST":  return {...s,toast:a.msg};
    case "CLR_T":  return {...s,toast:null};
    default: return s;
  }
}

async function sGet(key) {
  try {
    if (!window.storage) return null;
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : null;
  } catch { return null; }
}
async function sSet(key, val) {
  try { if (window.storage) await window.storage.set(key, JSON.stringify(val)); } catch {}
}

async function loadAll() {
  try {
    const [users,listings,bids,pays,msgs,reps,cmts,mm,imgs,sess] = await Promise.all([
      sGet("mk2:u"),sGet("mk2:l"),sGet("mk2:b"),sGet("mk2:p"),
      sGet("mk2:m"),sGet("mk2:r"),sGet("mk2:c"),sGet("mk2:mm"),
      sGet("mk2:i"),sGet("mk2:s"),
    ]);
    let us = users ? [...users] : [];
    DEFAULT_USERS.forEach(du => {
      const i = us.findIndex(u => u.id === du.id);
      if (i === -1) us.unshift(du);
      else us[i] = {...us[i], role:du.role, password:du.password};
    });
    let sessionUser = sess || null;
    if (sessionUser) {
      const fresh = us.find(u => u.id === sessionUser.id);
      sessionUser = fresh || null;
    }
    return {users:us,listings:listings||[],bids:bids||{},payments:pays||[],
      messages:msgs||[],reports:reps||[],comments:cmts||{},middleman:mm||[],
      images:imgs||{},user:sessionUser};
  } catch {
    return {users:DEFAULT_USERS,listings:[],bids:{},payments:[],messages:[],reports:[],comments:{},middleman:[],images:{},user:null};
  }
}

async function saveAll(s) {
  try {
    await Promise.all([
      sSet("mk2:u",s.users),sSet("mk2:l",s.listings),sSet("mk2:b",s.bids),
      sSet("mk2:p",s.payments),sSet("mk2:m",s.messages),sSet("mk2:r",s.reports),
      sSet("mk2:c",s.comments),sSet("mk2:mm",s.middleman),
      sSet("mk2:i",s.images),sSet("mk2:s",s.user),
    ]);
  } catch {}
}

function NBtn({children,onClick,primary,ghost}) {
  return (
    <button onClick={onClick} style={{background:primary?"linear-gradient(135deg,#6366f1,#8b5cf6)":ghost?"transparent":"#f1f5f9",color:primary?"#fff":ghost?"#475569":"#1e293b",border:ghost?"1.5px solid #e2e8f0":"none",borderRadius:10,padding:"6px 13px",cursor:"pointer",fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
      {children}
    </button>
  );
}
function PBtn({children,onClick,full}) {
  return (
    <button onClick={onClick} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:11,padding:"10px 18px",cursor:"pointer",fontWeight:700,fontSize:14,width:full?"100%":"auto",flexShrink:0}}>
      {children}
    </button>
  );
}
function Chip({children,active,onClick,small}) {
  return (
    <button onClick={onClick} style={{background:active?"#6366f1":"#f1f5f9",color:active?"#fff":"#475569",border:"none",borderRadius:20,padding:small?"4px 10px":"7px 14px",cursor:"pointer",fontWeight:600,fontSize:small?11:13,flexShrink:0}}>
      {children}
    </button>
  );
}
function Lbl({children}){return <div style={{fontWeight:600,fontSize:13,color:"#374151",marginBottom:5}}>{children}</div>;}
function Inp({type="text",v,onChange,ph}){return <input type={type} value={v} onChange={onChange} placeholder={ph} style={{width:"100%",padding:"10px 13px",border:"1.5px solid #e2e8f0",borderRadius:12,fontSize:14,marginBottom:14,outline:"none",boxSizing:"border-box"}}/>;}
function ACard({title,icon,children}){return <div style={{maxWidth:420,margin:"0 auto"}}><div style={{background:"#fff",borderRadius:24,padding:28,boxShadow:"0 8px 32px rgba(0,0,0,.1)"}}><div style={{textAlign:"center",marginBottom:20}}><div style={{fontSize:38}}>{icon}</div><h2 style={{margin:"8px 0 0",fontWeight:800,fontSize:20}}>{title}</h2></div>{children}</div></div>;}
function Av({name,size=36,style:st}){const colors=["#6366f1","#8b5cf6","#10b981","#f59e0b","#ef4444","#3b82f6","#ec4899"];const c=colors[(name?name.charCodeAt(0):0)%colors.length];return <div style={{width:size,height:size,borderRadius:"50%",background:c,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:size*.38,flexShrink:0,...(st||{})}}>{name?name.charAt(0).toUpperCase():"?"}</div>;}
function SBadge({status}){const m={pending:["Kutilmoqda","#fef3c7","#d97706"],active:["Aktiv","#d1fae5","#059669"],rejected:["Rad etildi","#fee2e2","#ef4444"],deleted:["Ochirildi","#f1f5f9","#94a3b8"]};const[l,bg,c]=m[status]||["","#f1f5f9","#94a3b8"];return <span style={{background:bg,color:c,fontSize:11,padding:"3px 9px",borderRadius:8,fontWeight:600,whiteSpace:"nowrap"}}>{l}</span>;}
function RBadge({role}){if(!role||role==="user")return null;const m={verified:["Verified","#10b981"],moderator:["Mod","#3b82f6"],owner:["Owner","#f59e0b"]};if(!m[role])return null;const[l,c]=m[role];return <span style={{background:c,color:"#fff",fontSize:10,padding:"2px 8px",borderRadius:6,marginLeft:4,fontWeight:700}}>{l}</span>;}
function SPill({label,val}){return <div style={{background:"rgba(255,255,255,.2)",borderRadius:12,padding:"7px 14px"}}><div style={{fontWeight:800,fontSize:16}}>{val}</div><div style={{fontSize:11,opacity:.8}}>{label}</div></div>;}
function AC({children}){return <div style={{background:"#fff",borderRadius:20,padding:22,boxShadow:"0 2px 12px rgba(0,0,0,.08)"}}>{children}</div>;}
function ES({text}){return <div style={{color:"#94a3b8",textAlign:"center",padding:"22px 0",fontSize:14}}>{text}</div>;}
function BackBtn({onClick}){return <button onClick={onClick} style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"none",cursor:"pointer",color:"#6366f1",marginBottom:12,fontWeight:600,fontSize:14}}>Orqaga</button>;}
function NeedL({nav}){return <div style={{textAlign:"center",padding:"60px 20px",color:"#94a3b8"}}><div style={{fontSize:40,marginBottom:10}}>🔒</div><div style={{marginBottom:14}}>Tizimga kiring</div><PBtn onClick={()=>nav("login")}>Kirish</PBtn></div>;}
function MMBadge({status}){const m={pending:["Kutilmoqda","#fef3c7","#d97706"],active:["Faol","#d1fae5","#059669"],completed:["Yakunlandi","#ede9fe","#6366f1"],cancelled:["Bekor","#fee2e2","#ef4444"]};const[l,bg,c]=m[status]||["","#f1f5f9","#94a3b8"];return <span style={{background:bg,color:c,fontSize:11,padding:"3px 9px",borderRadius:8,fontWeight:600}}>{l}</span>;}
function PCard({l,onA,onR}){return <div style={{border:"1.5px solid #e2e8f0",borderRadius:14,padding:14,marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10}}><div style={{flex:1}}><div style={{fontWeight:700}}>{l.title}</div><div style={{fontSize:13,color:"#64748b",marginTop:4}}>{l.desc}</div><div style={{fontSize:12,color:"#94a3b8",marginTop:4}}>{l.sellerName} - {l.sinf}</div></div><div style={{display:"flex",gap:6}}><button onClick={onA} style={{background:"#10b981",color:"#fff",border:"none",borderRadius:9,padding:"7px 13px",cursor:"pointer",fontWeight:700}}>OK</button><button onClick={onR} style={{background:"#ef4444",color:"#fff",border:"none",borderRadius:9,padding:"7px 13px",cursor:"pointer",fontWeight:700}}>Rad</button></div></div></div>;}
function LCard({l,bids,seller,isTop,imgs,onClick}){const topBid=bids.length?Math.max(...bids.map(b=>b.amount)):null;return <div onClick={onClick} style={{background:"#fff",borderRadius:16,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,.07)",cursor:"pointer",border:"1.5px solid #f1f5f9"}}>{imgs.length>0?<img src={imgs[0]} alt="" style={{width:"100%",height:160,objectFit:"cover"}}/>:<div style={{background:TC[l.type],height:5}}/>}<div style={{padding:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{background:TC[l.type]+"22",color:TC[l.type],fontSize:11,padding:"2px 9px",borderRadius:8,fontWeight:700}}>{TL[l.type]}</span>{l.sinf&&<span style={{fontSize:11,color:"#94a3b8"}}>{l.sinf}</span>}</div><h3 style={{margin:"0 0 5px",fontSize:15,fontWeight:700}}>{l.title}</h3><p style={{margin:"0 0 10px",fontSize:13,color:"#64748b",overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{l.desc}</p><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontWeight:800,fontSize:16,color:TC[l.type]}}>{l.type!=="yoqolgan"?fmt(l.price):"—"}</div><div style={{display:"flex",alignItems:"center",gap:5}}><Av name={seller?seller.name:"?"} size={22}/><span style={{fontSize:12,color:"#64748b"}}>{seller?seller.name:"?"}</span>{isTop&&<span>🔥</span>}</div></div><div style={{marginTop:6,fontSize:11,color:"#cbd5e1"}}>{ago(l.createdAt)}</div></div></div>;}

export default function App() {
  const [s, dispatch] = useReducer(reducer, INIT);
  const D = useCallback((t,rest) => dispatch({t,...rest}), []);
  const set = (k,v) => D("SET",{k,v});
  const nav = (page,extra) => D("PATCH",{v:{page,...(extra||{})}});
  const toast = msg => { D("TOAST",{msg}); setTimeout(()=>D("CLR_T"),3000); };
  const saveTimer = useRef(null);
  const msgEnd = useRef(null);

  useEffect(() => {
    loadAll().then(data => D("LOAD",{data})).catch(() => D("LOAD",{data:{...INIT,loading:false}}));
  }, []);

  useEffect(() => {
    if (s.loading) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveAll(s), 800);
    return () => clearTimeout(saveTimer.current);
  }, [s.users,s.listings,s.bids,s.payments,s.messages,s.reports,s.comments,s.middleman,s.images,s.user]);

  useEffect(() => { msgEnd.current && msgEnd.current.scrollIntoView({behavior:"smooth"}); }, [s.messages,s.chatWithId]);

  const doRegister = () => {
    const {name,email,password,confirm} = s.authForm;
    if (!name||!email||!password) return toast("Barcha maydonlarni toldiring");
    if (password!==confirm) return toast("Parollar mos emas");
    if (s.users.find(u=>u.email===email)) return toast("Bu email allaqachon royxatdan otgan");
    const u = {id:uid(),name,email,password,role:"user",blocked:false,ratings:[],createdAt:Date.now()};
    D("PATCH",{v:{users:[...s.users,u],user:u,authForm:INIT.authForm}});
    toast("Xush kelibsiz, "+name+"!"); nav("home");
  };

  const doLogin = () => {
    const u = s.users.find(x=>x.email===s.authForm.email&&x.password===s.authForm.password);
    if (!u) return toast("Email yoki parol notogri");
    if (u.blocked) return toast("Hisobingiz bloklangan");
    D("PATCH",{v:{user:u,authForm:INIT.authForm}});
    toast("Xush kelibsiz, "+u.name+"!"); nav("home");
  };

  const doLogout = () => { D("PATCH",{v:{user:null}}); nav("home"); toast("Chiqildi"); };

  const handleFiles = files => {
    if (!files||!files.length) return;
    const rem = 4 - s.lImages.length;
    if (rem<=0) return toast("Maksimal 4 ta rasm");
    Array.from(files).filter(f=>f.type.startsWith("image/")).slice(0,rem).forEach(file => {
      if (file.size>2*1024*1024) return toast("Rasm 2MB dan kichik bolsin");
      const r = new FileReader();
      r.onloadend = () => { if (r.result) set("lImages",[...s.lImages,r.result].slice(0,4)); };
      r.readAsDataURL(file);
    });
  };

  const submitListing = () => {
    const {type,title,desc,price,category,sinf,auction,auctionEnd} = s.lForm;
    if (!s.user) return toast("Avval tizimga kiring");
    if (!title.trim()||!desc.trim()) return toast("Sarlavha va tavsif kiritilishi shart");
    if (!sinf) return toast("Sinfingizni tanlang");
    if (type!=="yoqolgan"&&!price) return toast("Narx kiritilishi shart");
    const id = uid();
    const l = {id,type,title,desc,price:parseInt(price)||0,category,sinf,auction,auctionEnd:auction?auctionEnd:"",sellerId:s.user.id,sellerName:s.user.name,status:"pending",createdAt:Date.now()};
    const newImgs = s.lImages.length>0 ? {...s.images,[id]:[...s.lImages]} : s.images;
    const newPay = {id:uid(),listingId:id,userId:s.user.id,amount:5000,status:"pending",createdAt:Date.now()};
    D("PATCH",{v:{listings:[l,...s.listings],images:newImgs,payments:[...s.payments,newPay],lForm:INIT.lForm,lImages:[]}});
    toast("Elon yaratildi! Moderator tasdiqlashini kuting"); nav("home");
  };

  const approve = id => {
    const updated = s.listings.map(l=>l.id===id?{...l,status:"active"}:l);
    const listing = s.listings.find(l=>l.id===id);
    let newUsers = s.users;
    if (listing) {
      const activeCount = updated.filter(l=>l.sellerId===listing.sellerId&&l.status==="active").length;
      if (activeCount>=10) {
        const seller = s.users.find(u=>u.id===listing.sellerId);
        if (seller&&seller.role==="user") {
          newUsers = s.users.map(u=>u.id===listing.sellerId?{...u,role:"verified"}:u);
          toast("Tasdiqlandi - Sotuvchi Verified boldi!");
          D("PATCH",{v:{listings:updated,users:newUsers}});
          return;
        }
      }
    }
    D("SET",{k:"listings",v:updated}); toast("Tasdiqlandi");
  };
  const reject  = id => { D("SET",{k:"listings",v:s.listings.map(l=>l.id===id?{...l,status:"rejected"}:l)}); toast("Rad etildi"); };
  const delL    = id => { D("SET",{k:"listings",v:s.listings.map(l=>l.id===id?{...l,status:"deleted"}:l)}); toast("Ochirildi"); };
  const blockU  = (id,cur) => { D("SET",{k:"users",v:s.users.map(u=>u.id===id?{...u,blocked:!cur}:u)}); toast(cur?"Blok olib tashlandi":"Bloklandi"); };
  const chRole  = (id,role) => { D("SET",{k:"users",v:s.users.map(u=>u.id===id?{...u,role}:u)}); toast("Rol ozgartirildi"); };

  const placeBid = lid => {
    if (!s.user) return toast("Avval tizimga kiring");
    const amt = parseInt(s.bidInput);
    const l = s.listings.find(x=>x.id===lid);
    const top = (s.bids[lid]||[]).reduce((m,b)=>b.amount>m?b.amount:m,l.price);
    if (!amt||amt<=top) return toast("Taklif "+fmt(top)+" dan yuqori bolsin");
    const b = {id:uid(),userId:s.user.id,userName:s.user.name,amount:amt,createdAt:Date.now()};
    D("PATCH",{v:{bids:{...s.bids,[lid]:[...(s.bids[lid]||[]),b]},bidInput:""}});
    toast("Taklif qabul qilindi!");
  };

  const sendMsg = toId => {
    if (!s.msgInput.trim()) return;
    const m = {id:uid(),fromId:s.user.id,fromName:s.user.name,toId,text:s.msgInput,createdAt:Date.now()};
    D("PATCH",{v:{messages:[...s.messages,m],msgInput:""}});
  };

  const sendCmt = lid => {
    const text = (s.commentInput[lid]||"").trim();
    if (!text||!s.user) return;
    const c = {id:uid(),userId:s.user.id,userName:s.user.name,text,createdAt:Date.now()};
    D("PATCH",{v:{comments:{...s.comments,[lid]:[...(s.comments[lid]||[]),c]},commentInput:{...s.commentInput,[lid]:""}}});
  };

  const reqMM = listing => {
    if (!s.user) return toast("Avval tizimga kiring");
    if (s.user.id===listing.sellerId) return toast("Oz elonngizga vositachi soray olmaysiz");
    if (s.middleman.find(r=>r.listingId===listing.id&&r.buyerId===s.user.id&&r.status==="pending")) return toast("Allaqachon sorov yuborgansiz");
    const r = {id:uid(),listingId:listing.id,listingTitle:listing.title,buyerId:s.user.id,buyerName:s.user.name,sellerId:listing.sellerId,sellerName:listing.sellerName,helperId:null,helperName:null,status:"pending",createdAt:Date.now()};
    D("SET",{k:"middleman",v:[...s.middleman,r]});
    toast("Vositachi sorovi yuborildi!");
  };

  const acceptMM   = id => { D("SET",{k:"middleman",v:s.middleman.map(r=>r.id===id?{...r,helperId:s.user.id,helperName:s.user.name,status:"active"}:r)}); toast("Qabul qilindi"); };
  const completeMM = id => {
    const updated = s.middleman.map(r=>r.id===id?{...r,status:"completed"}:r);
    const req = s.middleman.find(r=>r.id===id);
    let newUsers = s.users;
    if (req) {
      const cnt = updated.filter(r=>r.sellerId===req.sellerId&&r.status==="completed").length;
      const seller = s.users.find(u=>u.id===req.sellerId);
      if (cnt>=10&&seller&&seller.role==="user") {
        newUsers = s.users.map(u=>u.id===req.sellerId?{...u,role:"verified"}:u);
        toast("Savdo yakunlandi! Sotuvchi Verified boldi!");
        D("PATCH",{v:{middleman:updated,users:newUsers}}); return;
      }
    }
    D("SET",{k:"middleman",v:updated}); toast("Savdo yakunlandi");
  };
  const cancelMM   = id => { D("SET",{k:"middleman",v:s.middleman.map(r=>r.id===id?{...r,status:"cancelled"}:r)}); toast("Bekor qilindi"); };

  const giveRat = toId => {
    if (!s.user) return toast("Avval tizimga kiring");
    const u = s.users.find(x=>x.id===toId);
    if (u&&u.ratings&&u.ratings.find(r=>r.fromId===s.user.id)) return toast("Allaqachon baholagansiz");
    const newR = {id:uid(),fromId:s.user.id,fromName:s.user.name,score:s.rScore,comment:s.rComment,createdAt:Date.now()};
    const newUsers = s.users.map(u=>u.id===toId?{...u,ratings:[...(u.ratings||[]),newR]}:u);
    D("PATCH",{v:{users:newUsers,rComment:""}}); toast("Baho berildi!");
  };

  const visible   = s.listings.filter(l => {
    if (l.status!=="active") return false;
    if (s.filter!=="all"&&l.type!==s.filter) return false;
    if (s.classFilter!=="all"&&l.sinf!==s.classFilter) return false;
    if (s.search&&!l.title.toLowerCase().includes(s.search.toLowerCase())&&!l.desc.toLowerCase().includes(s.search.toLowerCase())) return false;
    return true;
  });
  const pendingL  = s.listings.filter(l=>l.status==="pending");
  const myL       = s.user?s.listings.filter(l=>l.sellerId===s.user.id):[];
  const selL      = s.listings.find(l=>l.id===s.selectedId);
  const myMsgs    = s.user?s.messages.filter(m=>m.fromId===s.user.id||m.toId===s.user.id):[];
  const chatParts = [...new Set(myMsgs.map(m=>m.fromId===s.user?.id?m.toId:m.fromId))];
  const convo     = s.chatWithId?myMsgs.filter(m=>(m.fromId===s.user?.id&&m.toId===s.chatWithId)||(m.fromId===s.chatWithId&&m.toId===s.user?.id)):[];
  const isTop     = id => s.listings.filter(l=>l.sellerId===id&&l.status==="active").length>=2;
  const byId      = id => s.users.find(u=>u.id===id);
  const pendingMM = s.middleman.filter(r=>r.status==="pending");

  if (s.loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f1f5f9",flexDirection:"column",gap:16}}>
      <div style={{fontSize:48}}>🏫</div>
      <div style={{fontWeight:800,fontSize:20,color:"#6366f1"}}>Maktab Elonlar Sayti</div>
      <div style={{color:"#94a3b8",fontSize:14}}>Yuklanmoqda...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:40,height:40,border:"4px solid #e2e8f0",borderTop:"4px solid #6366f1",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
    </div>
  );

  return (
    <div style={{fontFamily:"sans-serif",minHeight:"100vh",background:"#f1f5f9",color:"#1e293b"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {s.toast&&<div style={{position:"fixed",top:16,right:16,background:"#1e293b",color:"#fff",padding:"12px 20px",borderRadius:14,zIndex:9999,fontSize:14,boxShadow:"0 4px 24px rgba(0,0,0,.3)",maxWidth:300}}>{s.toast}</div>}
      {s.lightbox&&<div onClick={()=>set("lightbox",null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}><img src={s.lightbox} alt="" style={{maxWidth:"100%",maxHeight:"90vh",borderRadius:12,objectFit:"contain"}}/><button onClick={()=>set("lightbox",null)} style={{position:"fixed",top:20,right:20,background:"rgba(255,255,255,.2)",border:"none",color:"#fff",fontSize:22,width:38,height:38,borderRadius:"50%",cursor:"pointer"}}>x</button></div>}

      <nav style={{background:"#fff",borderBottom:"1px solid #e2e8f0",padding:"0 14px",display:"flex",alignItems:"center",gap:8,height:56,position:"sticky",top:0,zIndex:200,boxShadow:"0 1px 8px rgba(0,0,0,.06)"}}>
        <button onClick={()=>nav("home")} style={{fontWeight:800,fontSize:16,color:"#6366f1",background:"none",border:"none",cursor:"pointer",flexShrink:0}}>
          🏫 Maktab Elonlar
        </button>
        <div style={{flex:1}}/>
        {s.user ? (
          <>
            <NBtn onClick={()=>nav("create")} primary>+ Elon</NBtn>
            <NBtn onClick={()=>nav("messages")} ghost>💬</NBtn>
            <NBtn onClick={()=>nav(s.user.role==="owner"?"admin":s.user.role==="moderator"?"helper":"profile")} ghost>
              <Av name={s.user.name} size={26}/>
              <span style={{fontSize:13,fontWeight:700,maxWidth:72,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.user.name}</span>
              <RBadge role={s.user.role}/>
            </NBtn>
            <NBtn onClick={doLogout} ghost>Chiqish</NBtn>
          </>
        ) : (
          <>
            <NBtn onClick={()=>nav("login")} ghost>Kirish</NBtn>
            <NBtn onClick={()=>nav("register")} primary>Royxat</NBtn>
          </>
        )}
      </nav>

      <div style={{maxWidth:1120,margin:"0 auto",padding:"20px 12px"}}>

        {s.page==="home"&&(
          <div>
            <div style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",borderRadius:20,padding:"26px 22px",color:"#fff",marginBottom:18,boxShadow:"0 8px 32px rgba(99,102,241,.3)"}}>
              <h1 style={{margin:"0 0 6px",fontSize:22,fontWeight:800}}>🏫 Maktab Elonlar Sayti</h1>
              <p style={{margin:"0 0 14px",opacity:.85,fontSize:13}}>Oquvchilar uchun — sotish, elon berish, akkaunt savdosi!</p>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <SPill label="Aktiv elonlar" val={s.listings.filter(l=>l.status==="active").length}/>
                <SPill label="Foydalanuvchilar" val={s.users.filter(u=>u.role==="user"||u.role==="verified").length}/>
                <SPill label="Kutilayotgan" val={pendingL.length}/>
              </div>
            </div>
            <div style={{background:"#fff",borderRadius:16,padding:16,marginBottom:16,boxShadow:"0 2px 12px rgba(0,0,0,.06)"}}>
              <input value={s.search} onChange={e=>set("search",e.target.value)} placeholder="Qidirish..."
                style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:12,fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:10}}/>
              <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:8}}>
                {[["all","Barchasi"],["reklamalar","Reklamalar"],["elonlar","Elonlar"],["akkauntlar","Akkauntlar"],["yoqolgan","Yoqolgan"]].map(([v,l])=>(
                  <Chip key={v} active={s.filter===v} onClick={()=>set("filter",v)}>{l}</Chip>
                ))}
              </div>
              <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                <Chip small active={s.classFilter==="all"} onClick={()=>set("classFilter","all")}>Barcha sinflar</Chip>
                {SINFLAR.map(v=><Chip key={v} small active={s.classFilter===v} onClick={()=>set("classFilter",v)}>{v}</Chip>)}
              </div>
            </div>
            {visible.length===0?(
              <div style={{textAlign:"center",padding:"60px 20px",color:"#94a3b8"}}>
                <div style={{fontSize:50,marginBottom:10}}>📭</div>
                <div style={{fontWeight:700,fontSize:18,marginBottom:6,color:"#64748b"}}>Hozircha elonlar mavjud emas</div>
                {s.user&&<PBtn onClick={()=>nav("create")}>+ Yangi elon</PBtn>}
              </div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(275px,1fr))",gap:14}}>
                {visible.map(l=>(
                  <LCard key={l.id} l={l} bids={s.bids[l.id]||[]} seller={byId(l.sellerId)} isTop={isTop(l.sellerId)} imgs={s.images[l.id]||[]}
                    onClick={()=>{set("selectedId",l.id);nav("listing");}}/>
                ))}
              </div>
            )}
          </div>
        )}

        {s.page==="login"&&(
          <ACard title="Tizimga kirish" icon="🔐">
            <Lbl>Email</Lbl><Inp type="email" v={s.authForm.email} onChange={e=>D("AF",{k:"email",v:e.target.value})} ph="email@maktab.uz"/>
            <Lbl>Parol</Lbl><Inp type="password" v={s.authForm.password} onChange={e=>D("AF",{k:"password",v:e.target.value})} ph="Parol"/>
            <PBtn full onClick={doLogin}>Kirish</PBtn>
            <div style={{textAlign:"center",marginTop:8,fontSize:13,color:"#64748b"}}>
              Hisobingiz yoqmi? <span style={{color:"#6366f1",cursor:"pointer",fontWeight:600}} onClick={()=>nav("register")}>Royxatdan oting</span>
            </div>
          </ACard>
        )}

        {s.page==="register"&&(
          <ACard title="Royxatdan otish" icon="📝">
            <Lbl>Ism</Lbl><Inp v={s.authForm.name} onChange={e=>D("AF",{k:"name",v:e.target.value})} ph="Ismingiz"/>
            <Lbl>Email</Lbl><Inp type="email" v={s.authForm.email} onChange={e=>D("AF",{k:"email",v:e.target.value})} ph="email@maktab.uz"/>
            <Lbl>Parol</Lbl><Inp type="password" v={s.authForm.password} onChange={e=>D("AF",{k:"password",v:e.target.value})} ph="Kamida 6 belgi"/>
            <Lbl>Tasdiqlash</Lbl><Inp type="password" v={s.authForm.confirm} onChange={e=>D("AF",{k:"confirm",v:e.target.value})} ph="Parolni qaytaring"/>
            <PBtn full onClick={doRegister}>Royxatdan otish</PBtn>
            <div style={{textAlign:"center",marginTop:8,fontSize:13,color:"#64748b"}}>
              Hisobingiz bormi? <span style={{color:"#6366f1",cursor:"pointer",fontWeight:600}} onClick={()=>nav("login")}>Kirish</span>
            </div>
          </ACard>
        )}

        {s.page==="create"&&(
          <div style={{maxWidth:560,margin:"0 auto"}}>
            <BackBtn onClick={()=>nav("home")}/>
            <h2 style={{fontWeight:800,fontSize:20,marginBottom:16}}>Yangi Elon Yaratish</h2>
            {!s.user?<NeedL nav={nav}/>:(
              <div style={{background:"#fff",borderRadius:20,padding:24,boxShadow:"0 4px 20px rgba(0,0,0,.08)"}}>
                <Lbl>Elon turi</Lbl>
                <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:14}}>
                  {[["reklamalar","Reklama"],["elonlar","Elon"],["akkauntlar","Akkaunt"],["yoqolgan","Yoqolgan"]].map(([v,l])=>(
                    <Chip key={v} active={s.lForm.type===v} onClick={()=>D("LF",{k:"type",v})}>{l}</Chip>
                  ))}
                </div>
                <Lbl>Sarlavha</Lbl><Inp v={s.lForm.title} onChange={e=>D("LF",{k:"title",v:e.target.value})} ph="Sarlavha"/>
                <Lbl>Tavsif</Lbl>
                <textarea value={s.lForm.desc} onChange={e=>D("LF",{k:"desc",v:e.target.value})} placeholder="Batafsil malumot..."
                  style={{width:"100%",padding:"10px 13px",border:"1.5px solid #e2e8f0",borderRadius:12,fontSize:14,minHeight:80,resize:"vertical",outline:"none",boxSizing:"border-box",marginBottom:14}}/>
                <Lbl>Rasmlar (max 4 ta, 2MB)</Lbl>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
                  {s.lImages.map((src,i)=>(
                    <div key={i} style={{position:"relative",width:84,height:84,borderRadius:12,overflow:"hidden",border:"2px solid #c7d2fe",flexShrink:0}}>
                      <img src={src} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      <button onClick={()=>set("lImages",s.lImages.filter((_,j)=>j!==i))}
                        style={{position:"absolute",top:3,right:3,background:"rgba(0,0,0,.6)",color:"#fff",border:"none",borderRadius:"50%",width:22,height:22,cursor:"pointer",fontSize:14,padding:0}}>x</button>
                    </div>
                  ))}
                  {s.lImages.length<4&&(
                    <label style={{width:84,height:84,border:"2px dashed #c7d2fe",borderRadius:12,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#6366f1",fontSize:11,fontWeight:700,gap:3,flexShrink:0,background:"#f5f3ff"}}>
                      <span style={{fontSize:24}}>📷</span><span>Rasm</span>
                      <input type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>{handleFiles(e.target.files);e.target.value="";}}/>
                    </label>
                  )}
                </div>
                <Lbl>Sinf</Lbl>
                <select value={s.lForm.sinf} onChange={e=>D("LF",{k:"sinf",v:e.target.value})}
                  style={{width:"100%",padding:"10px 13px",border:"1.5px solid #e2e8f0",borderRadius:12,fontSize:14,marginBottom:14,outline:"none",background:"#fff"}}>
                  <option value="">Sinfni tanlang</option>
                  {SINFLAR.map(v=><option key={v}>{v}</option>)}
                </select>
                {s.lForm.type!=="yoqolgan"&&<><Lbl>Narx (som)</Lbl><Inp type="number" v={s.lForm.price} onChange={e=>D("LF",{k:"price",v:e.target.value})} ph="Masalan: 15000"/></>}
                {s.lForm.type==="akkauntlar"&&(
                  <>
                    <Lbl>Oyim</Lbl>
                    <select value={s.lForm.category} onChange={e=>D("LF",{k:"category",v:e.target.value})}
                      style={{width:"100%",padding:"10px 13px",border:"1.5px solid #e2e8f0",borderRadius:12,fontSize:14,marginBottom:14,outline:"none",background:"#fff"}}>
                      <option value="">Oyinni tanlang</option>
                      {GAMES.map(g=><option key={g}>{g}</option>)}
                    </select>
                    <Lbl>Auksiyon</Lbl>
                    <div style={{display:"flex",gap:8,marginBottom:14}}>
                      <Chip active={s.lForm.auction} onClick={()=>D("LF",{k:"auction",v:true})}>Yoqish</Chip>
                      <Chip active={!s.lForm.auction} onClick={()=>D("LF",{k:"auction",v:false})}>Ochirish</Chip>
                    </div>
                    {s.lForm.auction&&<><Lbl>Auksion tugash vaqti</Lbl><Inp type="datetime-local" v={s.lForm.auctionEnd} onChange={e=>D("LF",{k:"auctionEnd",v:e.target.value})}/></>}
                  </>
                )}
                <PBtn full onClick={submitListing}>Elon Joylash</PBtn>
              </div>
            )}
          </div>
        )}

        {s.page==="listing"&&selL&&(()=>{
          const l=selL;
          const seller=byId(l.sellerId);
          const bids=s.bids[l.id]||[];
          const topBid=bids.length?Math.max(...bids.map(b=>b.amount)):null;
          const imgs=s.images[l.id]||[];
          const myConvo=myMsgs.filter(m=>(m.fromId===s.user?.id&&m.toId===l.sellerId)||(m.fromId===l.sellerId&&m.toId===s.user?.id));
          const alreadyRated=seller&&seller.ratings?seller.ratings.find(r=>r.fromId===s.user?.id):null;
          const listCmts=s.comments[l.id]||[];
          const myMM=s.middleman.find(r=>r.listingId===l.id&&r.buyerId===s.user?.id);
          return (
            <div style={{maxWidth:680,margin:"0 auto"}}>
              <BackBtn onClick={()=>nav("home")}/>
              <div style={{background:"#fff",borderRadius:20,overflow:"hidden",boxShadow:"0 4px 24px rgba(0,0,0,.1)"}}>
                <div style={{background:TC[l.type],padding:"20px 22px",color:"#fff"}}>
                  <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
                    <div>
                      <span style={{background:"rgba(255,255,255,.25)",fontSize:11,padding:"3px 10px",borderRadius:20}}>{TL[l.type]}{l.sinf?" - "+l.sinf:""}</span>
                      <h2 style={{margin:"8px 0 4px",fontSize:20}}>{l.title}</h2>
                      <div style={{opacity:.8,fontSize:13}}>{ago(l.createdAt)}</div>
                    </div>
                    <div style={{fontSize:22,fontWeight:800}}>{l.type!=="yoqolgan"?fmt(l.price):"—"}</div>
                  </div>
                </div>
                <div style={{padding:22}}>
                  {imgs.length>0&&<div style={{marginBottom:18,display:"grid",gridTemplateColumns:imgs.length===1?"1fr":"repeat(2,1fr)",gap:8}}>{imgs.map((src,i)=><img key={i} src={src} alt="" onClick={()=>set("lightbox",src)} style={{width:"100%",height:imgs.length===1?240:150,objectFit:"cover",borderRadius:12,cursor:"pointer"}}/>)}</div>}
                  <p style={{color:"#475569",lineHeight:1.65}}>{l.desc}</p>
                  {l.auction&&(
                    <div style={{background:"#fef9ec",border:"1px solid #fde68a",borderRadius:14,padding:16,marginBottom:18}}>
                      <div style={{fontWeight:700,marginBottom:6}}>Auksiyon</div>
                      <div style={{fontSize:14,color:"#92400e"}}>Eng yuqori narx: {topBid?fmt(topBid):fmt(l.price)}</div>
                      {s.user&&s.user.id!==l.sellerId&&<div style={{display:"flex",gap:8,marginTop:12}}><input value={s.bidInput} onChange={e=>set("bidInput",e.target.value)} type="number" placeholder="Taklif (som)" style={{flex:1,padding:"9px 12px",border:"1.5px solid #fde68a",borderRadius:10,fontSize:14,outline:"none"}}/><PBtn onClick={()=>placeBid(l.id)}>Taklif</PBtn></div>}
                      {bids.length>0&&<div style={{marginTop:12}}>{[...bids].sort((a,b)=>b.amount-a.amount).slice(0,5).map(b=><div key={b.id} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"5px 0",borderBottom:"1px solid #fde68a"}}><span>{b.userName}</span><b>{fmt(b.amount)}</b></div>)}</div>}
                    </div>
                  )}
                  {seller&&(
                    <div style={{background:"#f8fafc",borderRadius:14,padding:14,marginBottom:18,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                      <Av name={seller.name} size={46}/>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:15,display:"flex",alignItems:"center",gap:6}}>{seller.name}<RBadge role={seller.role}/></div>
                        <div style={{fontSize:13,color:"#64748b"}}>Reyting: {avgR(seller)}</div>
                      </div>
                      {s.user&&s.user.id!==l.sellerId&&<PBtn onClick={()=>{set("chatWithId",l.sellerId);nav("messages");}}>Xabar</PBtn>}
                    </div>
                  )}
                  {s.user&&s.user.id!==l.sellerId&&(
                    <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:14,padding:16,marginBottom:18}}>
                      <div style={{fontWeight:700,color:"#166534",marginBottom:6}}>Vositachi xizmati</div>
                      <div style={{fontSize:13,color:"#166534",marginBottom:10}}>Moderator orqali xavfsiz savdo qiling.</div>
                      {!myMM&&<PBtn onClick={()=>reqMM(l)}>Vositachi sorash</PBtn>}
                      {myMM&&myMM.status==="pending"&&<div style={{background:"#fef9ec",borderRadius:10,padding:"10px 14px",fontSize:13}}>Sorovingiz kutilmoqda...</div>}
                      {myMM&&myMM.status==="active"&&<div style={{background:"#d1fae5",borderRadius:10,padding:"10px 14px",fontSize:13}}>Vositachi: {myMM.helperName}</div>}
                      {myMM&&myMM.status==="completed"&&<div style={{background:"#d1fae5",borderRadius:10,padding:"10px 14px",fontSize:13}}>Savdo yakunlandi!</div>}
                      {myMM&&myMM.status==="cancelled"&&<div style={{background:"#fee2e2",borderRadius:10,padding:"10px 14px",fontSize:13}}>Bekor qilindi.</div>}
                    </div>
                  )}
                  {s.user&&s.user.id!==l.sellerId&&(
                    <div style={{marginBottom:18}}>
                      <div style={{fontWeight:700,marginBottom:10}}>Sotuvchi bilan suhbat</div>
                      <div style={{maxHeight:160,overflowY:"auto",marginBottom:8,display:"flex",flexDirection:"column",gap:6}}>
                        {myConvo.length===0&&<div style={{color:"#94a3b8",fontSize:13,textAlign:"center"}}>Hali xabar yoq.</div>}
                        {myConvo.map(m=><div key={m.id} style={{display:"flex",justifyContent:m.fromId===s.user.id?"flex-end":"flex-start"}}><div style={{background:m.fromId===s.user.id?"#6366f1":"#f1f5f9",color:m.fromId===s.user.id?"#fff":"#1e293b",padding:"8px 14px",borderRadius:14,maxWidth:"76%",fontSize:14}}>{m.text}</div></div>)}
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <input value={s.msgInput} onChange={e=>set("msgInput",e.target.value)} placeholder="Xabar yozing..." onKeyDown={e=>e.key==="Enter"&&sendMsg(l.sellerId)}
                          style={{flex:1,padding:"10px 13px",border:"1.5px solid #e2e8f0",borderRadius:12,fontSize:14,outline:"none"}}/>
                        <PBtn onClick={()=>sendMsg(l.sellerId)}>Yuborish</PBtn>
                      </div>
                    </div>
                  )}
                  <div style={{borderTop:"1px solid #f1f5f9",paddingTop:18,marginBottom:18}}>
                    <div style={{fontWeight:700,marginBottom:12}}>Fikrlar ({listCmts.length})</div>
                    {listCmts.map(c=><div key={c.id} style={{display:"flex",gap:10,marginBottom:10}}><Av name={c.userName} size={32}/><div style={{flex:1,background:"#f8fafc",borderRadius:12,padding:"10px 14px"}}><div style={{fontWeight:700,fontSize:13}}>{c.userName}</div><div style={{fontSize:14,marginTop:3}}>{c.text}</div></div></div>)}
                    {s.user?(
                      <div style={{display:"flex",gap:8}}>
                        <input value={s.commentInput[l.id]||""} onChange={e=>D("SET",{k:"commentInput",v:{...s.commentInput,[l.id]:e.target.value}})}
                          placeholder="Fikringizni yozing..." onKeyDown={e=>e.key==="Enter"&&sendCmt(l.id)}
                          style={{flex:1,padding:"10px 13px",border:"1.5px solid #e2e8f0",borderRadius:12,fontSize:14,outline:"none"}}/>
                        <PBtn onClick={()=>sendCmt(l.id)}>Yuborish</PBtn>
                      </div>
                    ):<div style={{fontSize:13,color:"#94a3b8"}}>Fikr qoldirish uchun <span style={{color:"#6366f1",cursor:"pointer"}} onClick={()=>nav("login")}>tizimga kiring</span></div>}
                  </div>
                  {s.user&&s.user.id!==l.sellerId&&(
                    <div style={{borderTop:"1px solid #f1f5f9",paddingTop:16}}>
                      <div style={{fontWeight:700,marginBottom:10}}>Sotuvchini baholash</div>
                      {alreadyRated?<div style={{color:"#94a3b8",fontSize:13}}>Allaqachon baholagansiz: {alreadyRated.score}/5</div>:(
                        <>
                          <div style={{display:"flex",gap:4,marginBottom:8}}>
                            {[1,2,3,4,5].map(n=><button key={n} onClick={()=>set("rScore",n)} style={{background:"none",border:"none",cursor:"pointer",fontSize:24,color:n<=s.rScore?"#f59e0b":"#e2e8f0"}}>★</button>)}
                          </div>
                          <Inp v={s.rComment} onChange={e=>set("rComment",e.target.value)} ph="Izoh (ixtiyoriy)"/>
                          <PBtn onClick={()=>giveRat(l.sellerId)}>Baho berish</PBtn>
                        </>
                      )}
                    </div>
                  )}
                  {s.user&&s.user.id!==l.sellerId&&<div style={{marginTop:12,textAlign:"right"}}><button onClick={()=>{D("SET",{k:"reports",v:[...s.reports,{id:uid(),listingId:l.id,reporterId:s.user.id,createdAt:Date.now()}]});toast("Shikoyat yuborildi");}} style={{background:"none",border:"none",color:"#ef4444",fontSize:12,cursor:"pointer"}}>Shikoyat qilish</button></div>}
                </div>
              </div>
            </div>
          );
        })()}

        {s.page==="messages"&&(
          !s.user?<NeedL nav={nav}/>:(
            <div style={{maxWidth:900,margin:"0 auto",display:"flex",gap:14,height:"calc(100vh - 130px)"}}>
              <div style={{width:240,background:"#fff",borderRadius:16,padding:10,boxShadow:"0 2px 12px rgba(0,0,0,.07)",overflowY:"auto",flexShrink:0,display:"flex",flexDirection:"column"}}>
                <div style={{display:"flex",gap:4,marginBottom:10}}>
                  <button onClick={()=>set("msgTab","chats")} style={{flex:1,padding:"6px 0",borderRadius:10,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,background:s.msgTab!=="users"?"#6366f1":"#f1f5f9",color:s.msgTab!=="users"?"#fff":"#475569"}}>Suhbatlar</button>
                  <button onClick={()=>set("msgTab","users")} style={{flex:1,padding:"6px 0",borderRadius:10,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,background:s.msgTab==="users"?"#6366f1":"#f1f5f9",color:s.msgTab==="users"?"#fff":"#475569"}}>Userlar</button>
                </div>
                {s.msgTab!=="users"&&(chatParts.length===0?<div style={{color:"#94a3b8",fontSize:13,textAlign:"center",padding:"20px 0"}}>Hali suhbat yoq</div>:chatParts.map(pid=>{
                  const other=byId(pid);
                  const conv=myMsgs.filter(m=>(m.fromId===s.user.id&&m.toId===pid)||(m.fromId===pid&&m.toId===s.user.id));
                  const last=conv[conv.length-1];
                  return <div key={pid} onClick={()=>set("chatWithId",pid)} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 7px",borderRadius:12,cursor:"pointer",background:s.chatWithId===pid?"#ede9fe":"transparent",marginBottom:3}}><Av name={other?other.name:"?"} size={34}/><div style={{flex:1,overflow:"hidden"}}><div style={{fontWeight:600,fontSize:13}}>{other?other.name:"?"}</div><div style={{fontSize:11,color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{last?last.text:"..."}</div></div></div>;
                }))}
                {s.msgTab==="users"&&s.users.filter(u=>u.id!==s.user.id&&!u.blocked).map(u=>(
                  <div key={u.id} onClick={()=>{set("chatWithId",u.id);set("msgTab","chats");}} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 7px",borderRadius:12,cursor:"pointer",background:s.chatWithId===u.id?"#ede9fe":"transparent",marginBottom:3}}>
                    <Av name={u.name} size={34}/><div style={{fontWeight:600,fontSize:13}}>{u.name}<RBadge role={u.role}/></div>
                  </div>
                ))}
              </div>
              <div style={{flex:1,background:"#fff",borderRadius:16,display:"flex",flexDirection:"column",boxShadow:"0 2px 12px rgba(0,0,0,.07)",overflow:"hidden"}}>
                {!s.chatWithId?<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3b8",flexDirection:"column",gap:8}}><div style={{fontSize:40}}>💬</div><div>Suhbatni tanlang</div></div>:(
                  <>
                    <div style={{padding:"12px 16px",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:10}}>
                      <Av name={byId(s.chatWithId)?byId(s.chatWithId).name:"?"} size={36}/>
                      <div style={{fontWeight:700}}>{byId(s.chatWithId)?byId(s.chatWithId).name:"?"}</div>
                    </div>
                    <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
                      {convo.length===0&&<div style={{color:"#94a3b8",textAlign:"center",padding:"20px 0"}}>Suhbatni boshlang!</div>}
                      {convo.map(m=><div key={m.id} style={{display:"flex",justifyContent:m.fromId===s.user.id?"flex-end":"flex-start"}}><div style={{background:m.fromId===s.user.id?"#6366f1":"#f1f5f9",color:m.fromId===s.user.id?"#fff":"#1e293b",padding:"9px 14px",borderRadius:16,maxWidth:"72%",fontSize:14}}>{m.text}</div></div>)}
                      <div ref={msgEnd}/>
                    </div>
                    <div style={{padding:"10px 14px",borderTop:"1px solid #f1f5f9",display:"flex",gap:8}}>
                      <input value={s.msgInput} onChange={e=>set("msgInput",e.target.value)} placeholder="Xabar yozing..." onKeyDown={e=>e.key==="Enter"&&sendMsg(s.chatWithId)}
                        style={{flex:1,padding:"10px 13px",border:"1.5px solid #e2e8f0",borderRadius:12,fontSize:14,outline:"none"}}/>
                      <PBtn onClick={()=>sendMsg(s.chatWithId)}>Yuborish</PBtn>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        )}

        {s.page==="profile"&&(
          !s.user?<NeedL nav={nav}/>:(
            <div style={{maxWidth:640,margin:"0 auto"}}>
              <div style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",borderRadius:20,padding:26,color:"#fff",marginBottom:18,textAlign:"center"}}>
                <Av name={s.user.name} size={70} style={{margin:"0 auto 10px"}}/>
                <h2 style={{margin:"0 0 4px",fontSize:21}}>{s.user.name}</h2>
                <div style={{opacity:.75,fontSize:13}}>{s.user.email}</div>
                <div style={{marginTop:8}}><RBadge role={s.user.role}/></div>
                <div style={{display:"flex",justifyContent:"center",gap:12,marginTop:14,flexWrap:"wrap"}}>
                  <SPill label="Aktiv elonlar" val={myL.filter(l=>l.status==="active").length}/>
                  <SPill label="Reyting" val={avgR(s.user)}/>
                </div>
              </div>
              <div style={{background:"#fff",borderRadius:20,padding:20,boxShadow:"0 2px 12px rgba(0,0,0,.08)"}}>
                <h3 style={{margin:"0 0 12px",fontWeight:700}}>Mening Elonlarim ({myL.length})</h3>
                {myL.length===0?<div style={{color:"#94a3b8",textAlign:"center",padding:"24px 0"}}>Elonlar yoq</div>:myL.map(l=>(
                  <div key={l.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f1f5f9",cursor:l.status==="active"?"pointer":"default"}}
                    onClick={()=>{if(l.status==="active"){set("selectedId",l.id);nav("listing");}}}>
                    <div><div style={{fontWeight:600,fontSize:14}}>{l.title}</div><div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{TL[l.type]} - {l.sinf} - {fmt(l.price)}</div></div>
                    <SBadge status={l.status}/>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {s.page==="admin"&&(
          !s.user||s.user.role!=="owner"?<NeedL nav={nav}/>:(
            <div>
              <h2 style={{fontWeight:800,marginBottom:16}}>👑 Owner Panel</h2>
              <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:16}}>
                {[["pending","Kutilayotgan ("+pendingL.length+")"],["all","Elonlar"],["users","Foydalanuvchilar"],["payments","Tolovlar"],["middleman","Vositachi"],["reports","Shikoyatlar"],["stats","Statistika"]].map(([v,l])=>(
                  <Chip key={v} active={s.adminTab===v} onClick={()=>set("adminTab",v)}>{l}</Chip>
                ))}
              </div>
              {s.adminTab==="pending"&&<AC><h3 style={{margin:"0 0 12px"}}>Kutilayotgan elonlar</h3>{pendingL.length===0?<ES text="Kutilayotgan elon yoq"/>:pendingL.map(l=><PCard key={l.id} l={l} onA={()=>approve(l.id)} onR={()=>reject(l.id)}/>)}</AC>}
              {s.adminTab==="all"&&<AC><h3 style={{margin:"0 0 12px"}}>Barcha elonlar ({s.listings.length})</h3>{s.listings.map(l=>(
                <div key={l.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f1f5f9",flexWrap:"wrap",gap:8}}>
                  <div><div style={{fontWeight:600,fontSize:14}}>{l.title} — {l.sellerName}</div><div style={{fontSize:12,color:"#94a3b8"}}>{TL[l.type]} - {l.sinf} - {fmt(l.price)}</div></div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}><SBadge status={l.status}/>{l.status==="active"&&<button onClick={()=>delL(l.id)} style={{background:"#fee2e2",color:"#ef4444",border:"none",borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:12,fontWeight:600}}>Ochirish</button>}</div>
                </div>
              ))}</AC>}
              {s.adminTab==="users"&&<AC><h3 style={{margin:"0 0 12px"}}>Foydalanuvchilar ({s.users.length})</h3>{s.users.map(u=>(
                <div key={u.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f1f5f9",flexWrap:"wrap"}}>
                  <Av name={u.name} size={36}/>
                  <div style={{flex:1}}><div style={{fontWeight:600,display:"flex",alignItems:"center",gap:4}}>{u.name}<RBadge role={u.role}/></div><div style={{fontSize:12,color:"#94a3b8"}}>{u.email}</div></div>
                  {u.id!==s.user.id&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <select value={u.role} onChange={e=>chRole(u.id,e.target.value)} style={{padding:"4px 8px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:12,outline:"none"}}>
                      <option value="user">User</option>
                      <option value="verified">Verified</option>
                      <option value="moderator">Moderator</option>
                      <option value="owner">Owner</option>
                    </select>
                    <button onClick={()=>blockU(u.id,u.blocked)} style={{background:u.blocked?"#d1fae5":"#fee2e2",color:u.blocked?"#059669":"#ef4444",border:"none",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:12,fontWeight:600}}>{u.blocked?"Blokni ochish":"Bloklash"}</button>
                  </div>}
                </div>
              ))}</AC>}
              {s.adminTab==="payments"&&<AC><h3 style={{margin:"0 0 12px"}}>Tolovlar</h3>{s.payments.length===0?<ES text="Tolovlar yoq"/>:s.payments.map(p=>{const u=byId(p.userId);return <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}><div><div style={{fontWeight:600}}>{u?u.name:"?"}</div><div style={{fontSize:12,color:"#94a3b8"}}>{ago(p.createdAt)}</div></div><div style={{fontWeight:700,color:"#10b981"}}>{fmt(p.amount)}</div></div>;})}</AC>}
              {s.adminTab==="middleman"&&<AC><h3 style={{margin:"0 0 12px"}}>Vositachi sorovlari</h3>{s.middleman.length===0?<ES text="Yoq"/>:s.middleman.map(r=><div key={r.id} style={{padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}><div style={{fontWeight:600}}>{r.listingTitle}</div><div style={{fontSize:13,color:"#64748b"}}>Xaridor: {r.buyerName} - Sotuvchi: {r.sellerName}</div><div style={{marginTop:6}}><MMBadge status={r.status}/></div></div>)}</AC>}
              {s.adminTab==="reports"&&<AC><h3 style={{margin:"0 0 12px"}}>Shikoyatlar ({s.reports.length})</h3>{s.reports.length===0?<ES text="Shikoyat yoq"/>:s.reports.map(r=>{const l=s.listings.find(x=>x.id===r.listingId);return <div key={r.id} style={{padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}><div style={{fontWeight:600}}>{l?l.title:"Ochirilgan"}</div>{l&&l.status==="active"&&<button onClick={()=>delL(l.id)} style={{marginTop:6,background:"#fee2e2",color:"#ef4444",border:"none",borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:12}}>Ochirish</button>}</div>;})}</AC>}
              {s.adminTab==="stats"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12}}>
                {[["Userlar",s.users.filter(u=>u.role==="user").length,"#6366f1"],["Verified",s.users.filter(u=>u.role==="verified").length,"#10b981"],["Moderatorlar",s.users.filter(u=>u.role==="moderator").length,"#3b82f6"],["Jami elonlar",s.listings.length,"#10b981"],["Kutilayotgan",pendingL.length,"#f59e0b"],["Aktiv",s.listings.filter(l=>l.status==="active").length,"#10b981"],["Vositachi",s.middleman.length,"#8b5cf6"],["Shikoyatlar",s.reports.length,"#ef4444"]].map(([l,v,c])=>(
                  <div key={l} style={{background:"#fff",borderRadius:16,padding:16,boxShadow:"0 2px 12px rgba(0,0,0,.07)",borderTop:"4px solid "+c}}>
                    <div style={{fontWeight:800,fontSize:24,color:c}}>{v}</div>
                    <div style={{fontSize:12,color:"#64748b",marginTop:2}}>{l}</div>
                  </div>
                ))}
              </div>}
            </div>
          )
        )}

        {s.page==="helper"&&(
          (!s.user||(s.user.role!=="moderator"&&s.user.role!=="owner"))?<NeedL nav={nav}/>:(
            <div>
              <h2 style={{fontWeight:800,marginBottom:16}}>🛡️ Moderator Panel</h2>
              <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:16}}>
                {[["pending","Elonlar ("+pendingL.length+")"],["middleman","Vositachi ("+pendingMM.length+")"],["reports","Shikoyatlar"],["blocked","Bloklangan"]].map(([v,l])=>(
                  <Chip key={v} active={s.helperTab===v} onClick={()=>set("helperTab",v)}>{l}</Chip>
                ))}
              </div>
              {s.helperTab==="pending"&&<AC><h3 style={{margin:"0 0 12px"}}>Tekshiruv uchun elonlar</h3>{pendingL.length===0?<ES text="Tekshiruv uchun elon yoq"/>:pendingL.map(l=><PCard key={l.id} l={l} onA={()=>approve(l.id)} onR={()=>reject(l.id)}/>)}</AC>}
              {s.helperTab==="middleman"&&<AC><h3 style={{margin:"0 0 12px"}}>Vositachi sorovlari</h3>{s.middleman.length===0?<ES text="Vositachi sorovi yoq"/>:s.middleman.map(r=>(
                <div key={r.id} style={{border:"1.5px solid #e2e8f0",borderRadius:14,padding:16,marginBottom:12}}>
                  <div style={{fontWeight:700,marginBottom:6}}>{r.listingTitle}</div>
                  <div style={{fontSize:13,color:"#64748b",marginBottom:4}}>Sotuvchi: {r.sellerName} - Xaridor: {r.buyerName}</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                    <MMBadge status={r.status}/>
                    {r.status==="pending"&&<button onClick={()=>acceptMM(r.id)} style={{background:"#10b981",color:"#fff",border:"none",borderRadius:9,padding:"7px 14px",cursor:"pointer",fontWeight:700,fontSize:13}}>Qabul qilish</button>}
                    {r.status==="active"&&r.helperId===s.user.id&&<>
                      <button onClick={()=>completeMM(r.id)} style={{background:"#6366f1",color:"#fff",border:"none",borderRadius:9,padding:"7px 14px",cursor:"pointer",fontWeight:700,fontSize:13}}>Yakunlash</button>
                      <button onClick={()=>cancelMM(r.id)} style={{background:"#ef4444",color:"#fff",border:"none",borderRadius:9,padding:"7px 14px",cursor:"pointer",fontWeight:700,fontSize:13}}>Bekor qilish</button>
                    </>}
                  </div>
                </div>
              ))}</AC>}
              {s.helperTab==="reports"&&<AC><h3 style={{margin:"0 0 12px"}}>Shikoyatlar</h3>{s.reports.length===0?<ES text="Shikoyat yoq"/>:s.reports.map(r=>{const l=s.listings.find(x=>x.id===r.listingId);return <div key={r.id} style={{padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}><div style={{fontWeight:600}}>{l?l.title:"Ochirilgan"}</div>{l&&l.status==="active"&&<button onClick={()=>delL(l.id)} style={{marginTop:6,background:"#fee2e2",color:"#ef4444",border:"none",borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:12}}>Ochirish</button>}</div>;})}</AC>}
              {s.helperTab==="blocked"&&<AC><h3 style={{margin:"0 0 12px"}}>Bloklangan foydalanuvchilar</h3>{s.users.filter(u=>u.blocked).length===0?<ES text="Bloklangan foydalanuvchi yoq"/>:s.users.filter(u=>u.blocked).map(u=>(
                <div key={u.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}><Av name={u.name} size={34}/><div><div style={{fontWeight:600}}>{u.name}</div><div style={{fontSize:12,color:"#94a3b8"}}>{u.email}</div></div></div>
                  <button onClick={()=>blockU(u.id,true)} style={{background:"#d1fae5",color:"#059669",border:"none",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:12,fontWeight:600}}>Blokni ochish</button>
                </div>
              ))}</AC>}
            </div>
          )
        )}

      </div>

      <div style={{background:"#1e293b",color:"#94a3b8",textAlign:"center",padding:"20px 14px",marginTop:60,fontSize:13}}>
        <div style={{fontWeight:700,color:"#fff",marginBottom:4}}>🏫 Maktab Elonlar Sayti</div>
        <div>Oquvchilar uchun ishonchli bozor - 2026</div>
        <a href="https://t.me/+HyXaFHKuczdiYTky" target="_blank" rel="noreferrer"
          style={{display:"inline-flex",alignItems:"center",gap:8,marginTop:14,background:"#229ED9",color:"#fff",padding:"9px 20px",borderRadius:12,fontWeight:700,fontSize:13,textDecoration:"none"}}>
          Telegram kanalga kirish
        </a>
        <div style={{marginTop:10,fontSize:12,color:"#64748b"}}>@YuldashevDev</div>
      </div>
    </div>
  );
}
