import { useState, useMemo, useEffect } from "react";

const DAILY=98000,PR=0.6,HM=1.9,VAT=0.11,MKP=0.30;
const MINF=120000,MINP=72000,LSVC=60000,BOX=3800;
const MAXG=20,MAXD=30,DEFG=8;
const FRK="frokenselfoss",FRKRATE=Math.round(13990*0.85);
const FLATIDS=[FRK,"staff_dinner","lunch_box"];
const DELIVERY_RATES:any={
  day:{label:"Day rate (07:00-17:00)",rate:165},
  evening:{label:"Evening rate (17:00-00:00)",rate:175},
  weekend:{label:"Weekend / Holiday rate",rate:190}
};
const DVAT=0.24;

function getDeliveryTimeDefault(dateStr:string):string{
  if(!dateStr)return"day";
  const d=new Date(dateStr+"T12:00:00");
  const dow=d.getDay();
  if(dow===0||dow===6)return"weekend";
  if(getHol(dateStr))return"weekend";
  return"day";
}
const EJS_SVC="service_ayhh3cg";
const EJS_TPL="template_fj7cfgm";
const EJS_KEY="5CfQAtA4uOD5I2SiW";
const CHEF_EMAIL="arni@abveitingar.is";

const DRK:any={
  welcome_cocktail:{label:"Welcome Cocktail",def:554,note:"Chef can serve - no extra staff needed"},
  wine_pairing:{label:"Wine Pairing",def:3000,note:"Chef can serve - no extra staff needed"},
  full_bar:{label:"Full Bar Service",def:4000,note:"Bartender required - add extra staff above"},
};
const DMENUS:any[]=[
  {id:"breakfast",label:"Breakfast",base:2000,cat:"breakfast",del:false},
  {id:"dinner_home",label:"Dinner - Home Style",base:2200,cat:"dinner",del:false},
  {id:"dinner_2course",label:"Dinner - 2 Course",base:3100,cat:"dinner",del:false},
  {id:"dinner_3course",label:"Dinner - 3 Course Gourmet",base:4000,cat:"dinner",del:false},
  {id:FRK,label:"Froken Selfoss - 3 Course",base:FRKRATE,cat:"dinner",note:"Flat rate incl. VAT - 15% group discount - no chef service fee",del:false,fixed:true},
  {id:"staff_dinner",label:"Staff / Host Dinner",base:2900,cat:"other",note:"Flat rate incl. VAT - no markup - lodge management only",del:false,fixed:true},
  {id:"lunch_onsite",label:"Lunch On-Site",base:1200,cat:"lunch",note:"Ingredient est. only - 60,000 ISK service fee added separately",del:false},
  {id:"lunch_box",label:"Takeaway Lunch Box",base:3800,cat:"lunch",note:"Fixed flat rate incl. VAT - no additional markup",del:false,fixed:true},
];
const CATS:any={breakfast:"Breakfast",dinner:"Dinner",lunch:"Lunch",other:"Other",custom:"Custom"};

const avat=(b:number)=>b*(1+VAT);
const afull=(b:number)=>b*(1+VAT)*(1+MKP);
const fmt=(n:number)=>new Intl.NumberFormat("is-IS").format(Math.round(n));
const ISK=(n:number)=>fmt(n)+" ISK";
const fd=(s:string)=>s?new Date(s+"T12:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"}):"";
const fdS=(s:string)=>s?new Date(s+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"}):"";
const uid=()=>"x"+Math.random().toString(36).slice(2,7);
const cl=(v:string,mx:number)=>Math.min(Math.max(parseInt(v)||0,0),mx);
const rG=(ov:string,fb:number)=>{const v=parseInt(ov);return(!ov||isNaN(v)||v<=0)?fb:Math.min(v,MAXG);};
const QR="REF-"+Date.now().toString(36).toUpperCase();

function easter(y:number){
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,
    f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,
    i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),
    mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;
  return new Date(y,mo-1,da);
}
function addD(d:Date,n:number){const r=new Date(d);r.setDate(r.getDate()+n);return r;}
function sameD(a:Date,b:Date){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
function getHol(s:string):string|null{
  if(!s)return null;
  const[y,mo,da]=s.split("-").map(Number),m=mo-1,D=new Date(y,m,da);
  if(m===11&&da===24)return"Christmas Eve";
  if(m===11&&da===25)return"Christmas Day";
  if(m===11&&da===31)return"New Year's Eve";
  if(m===0&&da===1)return"New Year's Day";
  if(m===5&&da===17)return"National Day";
  const a1=new Date(y,7,1),fm=new Date(y,7,a1.getDay()===1?1:1+(8-a1.getDay())%7);
  if(m===7&&da===fm.getDate())return"Commerce Day";
  if(m===4&&da===1)return"Labour Day";
  // First Day of Summer: first Thursday on or after April 19
  const apr19=new Date(y,3,19);
  const daysToThur=(4-apr19.getDay()+7)%7;
  const firstSummer=new Date(y,3,19+daysToThur);
  if(sameD(D,firstSummer))return"First Day of Summer";
  const E=easter(y);
  if(sameD(D,addD(E,-3)))return"Maundy Thursday";
  if(sameD(D,addD(E,-2)))return"Good Friday";
  if(sameD(D,E))return"Easter Sunday";
  if(sameD(D,addD(E,39)))return"Ascension Day";
  if(sameD(D,addD(E,49)))return"Pentecost";
  if(sameD(D,addD(E,50)))return"Whit Monday";
  return null;
}
function genRange(s:string,e:string):string[]{
  if(!s||!e)return[];
  const sd=new Date(s+"T12:00:00"),ed=new Date(e+"T12:00:00");
  if(ed<sd)return[];
  const out:string[]=[],cur=new Date(sd);
  while(cur<=ed&&out.length<MAXD){out.push(cur.toISOString().split("T")[0]);cur.setDate(cur.getDate()+1);}
  return out;
}
function mkDef(date:string,i:number,n:number){
  const first=i===0&&n>1,last=i===n-1&&n>1;
  return{date,type:(first||last)?"partial":"full",gO:"",eS:0,
    bf:!first,bfG:"",dinId:last?"none":null as string|null,dinOv:last,dinG:"",
    sDin:false,sCnt:1,lType:"none",lG:"",lBudg:"",
    drkOn:false,drkT:"welcome_cocktail",drkPpp:"",drkG:"",
    ovn:false,ovnN:"",cxN:"",cxS:"",notes:"",
    deliveryKm:"",deliveryTime:"day",
    cateringName:"",cateringPricePph:"",cateringGuests:""};
}
function calcDay(day:any,GG:number,GD:string,menus:any[]){
  const h=getHol(day.date),hm=h?HM:1;
  const part=day.type==="partial",isDelivery=day.type==="delivery",tr=part?PR:1;
  const mb:any=Object.fromEntries(menus.map((m:any)=>[m.id,m]));
  const dG=rG(day.gO,GG),bfG=rG(day.bfG,dG),dinG=rG(day.dinG,dG);
  const lG=rG(day.lG,dG),drkG=rG(day.drkG,dG),es=parseInt(day.eS)||0;
  const effDin=day.dinOv?day.dinId:GD;
  const isFrk=effDin===FRK,frkBf=isFrk&&day.bf;
  const frkOnly=isFrk&&!day.bf&&day.lType==="none";
  const svcR=frkOnly||isDelivery?0:frkBf?PR*hm:tr*hm;
  const chef=DAILY*svcR;
  const staff=isDelivery?0:es*DAILY*0.6*(frkOnly?0:hm);
  const svcRaw=chef+staff;
  const min=frkOnly||isDelivery?0:(part?MINP:MINF);
  const lines:any[]=[];
  const push=(id:string,pax:number,flat=false)=>{
    const m=mb[id];if(!m||pax<=0)return;
    const base=m.base*pax;
    const isFlat=flat||FLATIDS.includes(id)||m.fixed===true;
    isFlat
      ?lines.push({key:id,label:m.label,pax,base,full:base,isFixed:true})
      :lines.push({key:id,label:m.label,pax,base,vatC:avat(base),full:afull(base),isFixed:false});
  };
  if(day.bf&&bfG>0)push("breakfast",bfG);
  if(effDin&&effDin!=="none"&&dinG>0)push(effDin,dinG,isFrk);
  if(day.sDin){const sc=parseInt(day.sCnt)||0;if(sc>0)push("staff_dinner",sc,true);}
  let lSvc=0;
  if(day.lType==="onsite"&&lG>0){lSvc=LSVC;push("lunch_onsite",lG);}
  else if(day.lType==="box"&&lG>0){const b=BOX*lG;lines.push({key:"lunch_box",label:"Takeaway Lunch Box",pax:lG,base:b,full:b,isFixed:true});}
  else if(day.lType==="custom"){const cb=parseFloat(day.lBudg)||0;if(cb>0)lines.push({key:"lunch_cx",label:"Lunch (Custom)",pax:lG||dG,base:cb,vatC:avat(cb),full:afull(cb),isFixed:false});}
  if(day.drkOn&&drkG>0){
    const opt=DRK[day.drkT],dppp=parseFloat(day.drkPpp)||opt?.def||0,db=dppp*drkG;
    lines.push({key:"drk_"+day.drkT,label:"Drinks - "+opt?.label,pax:drkG,base:db,vatC:avat(db),full:afull(db),isFixed:false});
  }
  const cx=parseFloat(day.cxS)||0;
  // Catering fixed price line (delivery days only)
  if(isDelivery){
    const pph=parseFloat(day.cateringPricePph)||0;
    const catG=rG(day.cateringGuests,dG);
    if(pph>0&&catG>0){
      const total=pph*catG;
      lines.push({key:"catering_custom",label:day.cateringName||"Catering",pax:catG,base:total,full:total,isFixed:true});
    }
  }
  const foodT=lines.reduce((s:number,l:any)=>s+l.full,0);
  const dkm=parseFloat(day.deliveryKm)||0;
  const autoTime=getDeliveryTimeDefault(day.date);
  const effectiveTime=autoTime==="weekend"?"weekend":day.deliveryTime;
  const drate=DELIVERY_RATES[effectiveTime]?.rate||165;
  const deliveryFee=isDelivery&&dkm>0?Math.round(dkm*drate*(1+DVAT)):0;
  const raw=svcRaw+lSvc+foodT+cx+deliveryFee;
  const ms=Math.max(0,min-raw);
  const svcA=svcRaw+ms;
  const sub=svcA+lSvc+foodT+cx+deliveryFee;
  return{chef,staff,svcRaw,svcA,minApp:ms>0,ms,min,h,hm,lines,lSvc,foodT,sub,cx,
    dG,bfG,dinG,lG,drkG,effDin,isFrk,frkOnly,frkBf,isDelivery,deliveryFee,dkm,drate};
}

const iS:any={border:"1px solid #e5e7eb",borderRadius:5,padding:"5px 8px",fontSize:13,width:"100%",boxSizing:"border-box",outline:"none",background:"#fff"};
const thS=(r:boolean):any=>({padding:"8px 10px",fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:.5,background:"#f9fafb",borderBottom:"1px solid #e5e7eb",textAlign:r?"right":"left"});
const tdS=(r:boolean,b=false):any=>({padding:"8px 10px",fontSize:b?14:13,fontWeight:b?800:400,borderBottom:"1px solid #f3f4f6",textAlign:r?"right":"left"});
const LB=({t,s}:{t:string,s?:boolean})=><div style={{fontSize:s?11:12,color:"#6b7280",marginBottom:3}}>{t}</div>;

function GIn({value,onChange,inh,label,sub}:{value:string,onChange:(v:string)=>void,inh:number,label?:string,sub?:boolean}){
  const ov=value!=="";
  return <div>
    {label&&<LB t={label} s={sub}/>}
    <div style={{position:"relative",display:"flex",alignItems:"center"}}>
      <input type="number" min={1} max={MAXG} value={value}
        onChange={e=>onChange(e.target.value===""?"":String(cl(e.target.value,MAXG)))}
        placeholder={String(inh)} style={{...iS,paddingRight:ov?26:8,borderColor:ov?"#f59e0b":"#e5e7eb"}}/>
      {ov&&<button onClick={()=>onChange("")} style={{position:"absolute",right:5,background:"none",border:"none",cursor:"pointer",fontSize:12,color:"#f59e0b",padding:0}}>x</button>}
    </div>
    <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{ov?"Override (inh: "+inh+")":"Inheriting: "+inh}</div>
  </div>;
}

export default function App(){
  const[rangeStart,setRangeStart]=useState("");
  const[rangeEnd,setRangeEnd]=useState("");
  const[excluded,setExcluded]=useState<Set<string>>(new Set());
  const[extraDates,setExtraDates]=useState<string[]>([]);
  const[newExtra,setNewExtra]=useState("");
  const[GG,setGG]=useState(DEFG);
  const[GD,setGD]=useState("dinner_3course");
  const[cfgs,setCfgs]=useState<any>({});
  const[tab,setTab]=useState("summary");
  const[sel,setSel]=useState<string|null>(null);
  const[menus,setMenus]=useState(DMENUS);
  const[nm,setNm]=useState({label:"",base:"",cat:"dinner",note:"",fixed:false});
  const[cN,setCN]=useState("");
  const[cE,setCE]=useState("");
  const[cL,setCL]=useState("");

  useEffect(()=>{
    const s=document.createElement("script");
    s.src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
    s.onload=()=>{(window as any).emailjs?.init({publicKey:EJS_KEY});};
    document.head.appendChild(s);
  },[]);

  const rangeDates=useMemo(()=>genRange(rangeStart,rangeEnd),[rangeStart,rangeEnd]);
  const dates=useMemo(()=>{
    const set=new Set([...rangeDates.filter((d:string)=>!excluded.has(d)),...extraDates]);
    return [...set].sort();
  },[rangeDates,excluded,extraDates]);
  const days=useMemo(()=>dates.map((d:string,i:number)=>cfgs[d]||mkDef(d,i,dates.length)),[dates,cfgs]);
  const calcs=useMemo(()=>days.map((d:any)=>calcDay(d,GG,GD,menus)),[days,GG,GD,menus]);

  const toggleExclude=(d:string)=>setExcluded((prev:Set<string>)=>{const n=new Set(prev);n.has(d)?n.delete(d):n.add(d);return n;});
  const addExtra=()=>{if(!newExtra||dates.includes(newExtra))return;setExtraDates((p:string[])=>[...p,newExtra].sort());setNewExtra("");};
  const removeExtra=(d:string)=>setExtraDates((p:string[])=>p.filter((x:string)=>x!==d));
  const upd=(date:string,p:any)=>setCfgs((prev:any)=>{
    const idx=dates.indexOf(date);
    const base=prev[date]||(idx>=0?mkDef(date,idx,dates.length):{});
    return{...prev,[date]:{...base,...p}};
  });
  const updM=(id:string,f:string,v:any)=>setMenus((ms:any[])=>ms.map((m:any)=>m.id===id?{...m,[f]:v}:m));
  const addM=()=>{
    if(!nm.label.trim()||!nm.base)return;
    setMenus((ms:any[])=>[...ms,{id:uid(),label:nm.label.trim(),base:parseFloat(nm.base),cat:nm.cat,note:nm.note||null,fixed:nm.fixed,del:true}]);
    setNm({label:"",base:"",cat:"dinner",note:"",fixed:false});
  };
  const rstM=(id:string)=>setMenus((ms:any[])=>ms.map((m:any)=>{const d=DMENUS.find((x:any)=>x.id===id);return m.id===id&&d?{...m,base:d.base}:m;}));

  const tots=useMemo(()=>{
    const svcT=calcs.reduce((s:number,d:any)=>s+d.svcA,0);
    const foodT=calcs.reduce((s:number,d:any)=>s+d.foodT,0);
    const cxT=calcs.reduce((s:number,d:any)=>s+d.cx,0);
    const grand=calcs.reduce((s:number,d:any)=>s+d.sub,0);
    const mMap:any={};
    calcs.forEach((dc:any)=>dc.lines.forEach((l:any)=>{
      if(!mMap[l.key])mMap[l.key]={label:l.label,days:0,pax:0,base:0,vatC:0,full:0,isFixed:l.isFixed};
      mMap[l.key].days++;mMap[l.key].pax+=l.pax||0;
      mMap[l.key].base+=l.base;mMap[l.key].vatC+=(l.vatC||0);mMap[l.key].full+=l.full;
    }));
    let can:any=null;
    if(dates.length>0){
      const diff=Math.ceil((new Date(dates[0]+"T12:00:00").getTime()-new Date().getTime())/86400000);
      if(diff>14)can={c:"#16a34a",l:"More than 14 days away",t:"Rescheduling at no charge if ingredients not purchased. Retainer non-refundable; other payments refunded if 30+ days out."};
      else if(diff>=0)can={c:"#dc2626",l:"Within 14 days",t:"All payments non-refundable. Staff must be paid per Icelandic union rules."};
      else can={c:"#9ca3af",l:"Event passed",t:"N/A"};
    }
    return{svcT,foodT,cxT,grand,ret:grand*.3,pre:grand*.8,fin:grand*.2,mMap,can};
  },[calcs,dates]);

  const mb:any=Object.fromEntries(menus.map((m:any)=>[m.id,m]));
  const dinMs=menus.filter((m:any)=>m.cat==="dinner");
  const isFlat=(m:any)=>FLATIDS.includes(m.id)||m.fixed===true;
  const mLabel=(m:any)=>isFlat(m)?ISK(m.base)+"/pax (flat)":"est. "+ISK(afull(m.base))+"/pax";

  const Tab=({id,l}:{id:string,l:string})=>(
    <button onClick={()=>setTab(id)} style={{padding:"9px 14px",border:"none",cursor:"pointer",fontSize:13,fontWeight:tab===id?700:400,color:tab===id?"#111827":"#6b7280",background:"none",borderBottom:tab===id?"2px solid #111827":"2px solid transparent",whiteSpace:"nowrap"}}>{l}</button>
  );
  const HolB=({n}:{n:string})=>(
    <span style={{marginLeft:6,padding:"1px 5px",borderRadius:3,fontSize:10,background:"#fef3c7",color:"#92400e",fontWeight:700}}>{n} x1.9</span>
  );

  const expQ=()=>{
    if(!dates.length)return;
    const daySections=days.map((day:any,i:number)=>{
      const c=calcs[i];
      const holNote=c.h?" ("+c.h+" x1.9)":"";
      const dayTypeLabel=day.type==="full"?"Full Day":day.type==="delivery"?"Meal Delivery / Catering":"Partial Day";
      let svcLines="";
      if(c.frkOnly){
        svcLines="<tr><td style='padding:4px 8px;color:#555'>No chef service fee</td><td></td><td style='padding:4px 8px;text-align:right;color:#7c3aed'>Froken Selfoss only</td></tr>";
      } else if(c.isDelivery){
        svcLines="<tr><td style='padding:4px 8px;color:#1e40af'>No chef service fee</td><td></td><td style='padding:4px 8px;text-align:right;color:#1e40af'>Meal Delivery / Catering day</td></tr>";
        if(c.deliveryFee>0){
          svcLines+="<tr><td style='padding:4px 8px;color:#1e40af'>Delivery fee ("+c.dkm+" km x "+c.drate+" ISK + 24% VAT)</td><td></td><td style='padding:4px 8px;text-align:right;font-weight:bold;color:#1e40af'>"+ISK(c.deliveryFee)+"</td></tr>";
        }
      } else {
        const chefLabel=(c.frkBf?"Chef fee (breakfast, partial rate)":"Chef fee - "+dayTypeLabel)+(c.h?" (x1.9 holiday)":"");
        svcLines+="<tr><td style='padding:4px 8px;color:#555'>"+chefLabel+"</td><td></td><td style='padding:4px 8px;text-align:right'>"+ISK(c.chef)+"</td></tr>";
        if(c.staff>0){
          svcLines+="<tr><td style='padding:4px 8px;color:#555'>Extra staff ("+day.eS+" x 58,800 ISK"+(c.h?" x1.9":"")+")</td><td></td><td style='padding:4px 8px;text-align:right'>"+ISK(c.staff)+"</td></tr>";
        }
        if(c.minApp){
          svcLines+="<tr><td style='padding:4px 8px;color:#d97706'>Minimum spend top-up (below min. "+ISK(c.min)+")</td><td></td><td style='padding:4px 8px;text-align:right;color:#d97706'>"+ISK(c.ms)+"</td></tr>";
        }
      }
      let foodLines="";
      c.lines.forEach((l:any)=>{
        const flatNote=l.isFixed?" (flat rate)":"";
        foodLines+="<tr><td style='padding:4px 8px;color:#555'>"+l.label+" x "+l.pax+" guests"+flatNote+"</td><td style='padding:4px 8px;text-align:right;color:#888'>"+(l.isFixed?"&mdash;":ISK(l.base))+"</td><td style='padding:4px 8px;text-align:right'>"+ISK(l.full)+"</td></tr>";
      });
      if(c.lSvc>0) foodLines+="<tr><td style='padding:4px 8px;color:#555'>On-Site Lunch service fee</td><td></td><td style='padding:4px 8px;text-align:right'>"+ISK(c.lSvc)+"</td></tr>";
      if(c.cx>0) foodLines+="<tr><td style='padding:4px 8px;color:#d97706'>Complexity surcharge"+(day.cxN?" - "+day.cxN:"")+"</td><td></td><td style='padding:4px 8px;text-align:right;color:#d97706'>"+ISK(c.cx)+"</td></tr>";
      return "<div style='margin-bottom:24px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;page-break-inside:avoid'>"+
        "<div style='background:#f5f5f5;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ddd'>"+
        "<div style='font-weight:bold;font-size:14px'>"+fd(day.date)+holNote+"</div>"+
        "<div style='font-size:12px;color:#555'>"+dayTypeLabel+" &middot; "+c.dG+" guests &middot; <b>"+ISK(c.sub)+"</b></div></div>"+
        "<table style='width:100%;border-collapse:collapse;font-size:12px'>"+
        "<thead><tr style='background:#fafafa'>"+
        "<th style='padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#888;border-bottom:1px solid #eee;width:55%'>Item</th>"+
        "<th style='padding:6px 8px;text-align:right;font-size:10px;text-transform:uppercase;color:#888;border-bottom:1px solid #eee;width:20%'>Base (excl. VAT+mkp)</th>"+
        "<th style='padding:6px 8px;text-align:right;font-size:10px;text-transform:uppercase;color:#888;border-bottom:1px solid #eee;width:25%'>Amount</th></tr></thead>"+
        "<tbody>"+
        "<tr><td colspan='3' style='padding:5px 8px;font-size:10px;text-transform:uppercase;color:#888;background:#f9fafb;letter-spacing:.5px'>Service Fee</td></tr>"+
        svcLines+
        "<tr style='background:#f9fafb'><td style='padding:6px 8px;font-weight:bold'>Service Fee Total</td><td></td><td style='padding:6px 8px;text-align:right;font-weight:bold'>"+(c.frkOnly?"&mdash;":ISK(c.svcA))+"</td></tr>"+
        (foodLines?"<tr><td colspan='3' style='padding:5px 8px;font-size:10px;text-transform:uppercase;color:#888;background:#f9fafb;letter-spacing:.5px'>Food &amp; Beverage (estimates)</td></tr>"+foodLines+
        "<tr style='background:#f9fafb'><td style='padding:6px 8px;font-weight:bold'>Food &amp; Bev Total (est.)</td><td></td><td style='padding:6px 8px;text-align:right;font-weight:bold'>"+ISK(c.foodT+c.lSvc)+"</td></tr>":"")+
        "</tbody><tfoot><tr style='background:#111827;color:#fff'>"+
        "<td colspan='2' style='padding:8px 14px;font-weight:bold;font-size:13px'>Day Total (estimate)</td>"+
        "<td style='padding:8px 14px;text-align:right;font-weight:bold;font-size:14px'>"+ISK(c.sub)+"</td></tr></tfoot></table></div>";
    }).join("");

    const summaryRows=days.map((day:any,i:number)=>{
      const c=calcs[i];
      const typeLabel=day.type==="full"?"Full Day":day.type==="delivery"?"Delivery/Catering":"Partial Day";
      return "<tr><td>"+fd(day.date)+(c.h?" ("+c.h+")":"")+"</td><td>"+typeLabel+(c.frkOnly?" (no svc fee)":"")+(c.isDelivery?" (no svc fee)":"")+"</td><td style='text-align:right'>"+( c.svcA>0?ISK(c.svcA):"&mdash;")+(c.minApp?" min.":"")+"</td><td style='text-align:right'>"+(c.foodT>0?ISK(c.foodT):"&mdash;")+"</td><td style='text-align:right'><b>"+ISK(c.sub)+"</b></td></tr>";
    }).join("");

    const clientBlock=cN||cE||cL?"<div style='background:#f9f9f9;border:1px solid #ddd;border-radius:6px;padding:14px;margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;font-size:12px'>"+
      (cN?"<div><p style='font-size:10px;text-transform:uppercase;color:#888;margin-bottom:2px'>Client</p><b>"+cN+"</b></div>":"")+
      (cE?"<div><p style='font-size:10px;text-transform:uppercase;color:#888;margin-bottom:2px'>Email</p><b>"+cE+"</b></div>":"")+
      (cL?"<div><p style='font-size:10px;text-transform:uppercase;color:#888;margin-bottom:2px'>Location</p><b>"+cL+"</b></div>":"")+"</div>":"";

    const payRows=[["Estimated Total",tots.grand,true],["30% Retainer (non-refundable, due on booking)",tots.ret,false],
      ["Additional pre-payment due 14 days before",tots.pre-tots.ret,false],
      ["Total due 14 days before event (80%)",tots.pre,true],
      ["Final balance - invoiced within 7 days post-event",tots.fin,false]]
      .map(([l,v,b])=>"<div style='display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eee;font-size:12px"+(b?";font-weight:bold;background:#f9fafb;padding:7px 4px":"")+"'><span>"+l+"</span><span>"+ISK(v as number)+"</span></div>").join("");

    const css="*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;color:#111;padding:40px;font-size:13px;line-height:1.6;max-width:900px;margin:0 auto}h1{font-size:24px;font-weight:bold;margin-bottom:4px}h2{font-size:12px;font-weight:bold;margin:28px 0 10px;padding-bottom:5px;border-bottom:2px solid #111;text-transform:uppercase;letter-spacing:.5px}.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid #111}.tot{font-size:28px;font-weight:bold;margin:4px 0}.stbl{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px}.stbl th{padding:7px 10px;background:#f5f5f5;border-bottom:2px solid #ccc;font-size:11px;text-transform:uppercase;letter-spacing:.4px;text-align:left}.stbl th.r{text-align:right}.stbl td{padding:7px 10px;border-bottom:1px solid #eee;vertical-align:top}.stbl td.r{text-align:right}.stbl tfoot td{font-weight:bold;background:#f5f5f5;border-top:2px solid #ccc}.disc{background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:14px;margin-top:24px;font-size:11px;color:#92400e;line-height:1.7}.foot{margin-top:32px;padding-top:14px;border-top:1px solid #ccc;font-size:11px;color:#888;text-align:center}@media print{body{padding:20px;max-width:100%}}";

    const html="<!DOCTYPE html><html><head><meta charset='utf-8'><title>Quote "+QR+"</title><style>"+css+"</style></head><body>"+
      "<div class='hdr'><div><h1>Private Chef Services</h1>"+
      "<p style='color:#666;font-size:12px;margin-top:2px'>Booking Quote &middot; <b>"+QR+"</b></p>"+
      "<p style='font-size:12px;margin-top:8px'><b>Dates:</b> "+dates.map((d:string)=>fdS(d)).join(", ")+" &middot; "+dates.length+" day"+(dates.length!==1?"s":"")+"</p>"+
      "<p style='font-size:11px;color:#888;margin-top:2px'>Generated: "+new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})+"</p></div>"+
      "<div style='text-align:right'><p style='font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px'>Estimated Total</p>"+
      "<div class='tot'>"+ISK(tots.grand)+"</div>"+
      "<p style='font-size:12px;margin-top:6px'>Retainer (30%): &nbsp;<b>"+ISK(tots.ret)+"</b></p>"+
      "<p style='font-size:12px'>Due 14 days prior (80%): &nbsp;<b>"+ISK(tots.pre)+"</b></p></div></div>"+
      clientBlock+
      "<h2>Summary</h2>"+
      "<table class='stbl'><thead><tr><th>Date</th><th>Type</th><th class='r'>Service Fee</th><th class='r'>Food &amp; Bev (est.)</th><th class='r'>Day Total</th></tr></thead>"+
      "<tbody>"+summaryRows+"</tbody>"+
      "<tfoot><tr><td colspan='2'><b>TOTAL</b></td><td class='r'><b>"+ISK(tots.svcT)+"</b></td><td class='r'><b>"+ISK(tots.foodT)+"</b></td><td class='r'><b>"+ISK(tots.grand)+"</b></td></tr></tfoot></table>"+
      "<h2>Detailed Breakdown</h2>"+daySections+
      "<h2>Payment Schedule</h2>"+payRows+
      "<div class='disc'><b>Important - Estimates Only:</b> All food and beverage costs are estimates. The final invoice is always based on actual cost of goods purchased + 11% VAT + 30% service markup. Froken Selfoss and Lunch Box charges are flat pass-through rates with no additional markup.</div>"+
      "<div class='foot'>Private Chef Services &middot; Selfoss, Iceland &middot; All prices include 11% VAT &middot; Quote: "+QR+"</div>"+
      "<script>window.onload=function(){window.print();}<\/script></body></html>";

    const blob=new Blob([html],{type:"text/html"}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="chef-quote-"+QR+".html";document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    if((window as any).emailjs){
      const quoteState=JSON.stringify({
        version:1,savedAt:new Date().toISOString(),
        rangeStart,rangeEnd,excluded:Array.from(excluded),extraDates,
        GG,GD,cfgs,cN,cE,cL,
        menus:menus.filter((m:any)=>m.del),
      }).replace(/@/g,"[at]").replace(/\.com/g,"[dot]com").replace(/\.is/g,"[dot]is").replace(/\.net/g,"[dot]net").replace(/\.org/g,"[dot]org");  // prevent email/URL auto-linking in EmailJS
      const dayLines=days.map((day:any,i:number)=>{
        const c=calcs[i];
        const typeLabel=day.type==="full"?"Full":day.type==="delivery"?"Delivery":"Partial";
        return fd(day.date)+" | "+typeLabel+" | Svc: "+(c.svcA>0?ISK(c.svcA):"--")+" | Food: "+(c.foodT>0?ISK(c.foodT):"--")+" | Total: "+ISK(c.sub);
      }).join("\n");

      (window as any).emailjs.send(EJS_SVC,EJS_TPL,{
        quote_ref:QR,
        client_name:cN||"--",
        client_email:cE||"--",
        client_location:cL||"--",
        dates:dates.map((d:string)=>fdS(d)).join(", "),
        total:ISK(tots.grand),
        retainer:ISK(tots.ret),
        due_prior:ISK(tots.pre),
        final_balance:ISK(tots.fin),
        day_summary:dayLines,
        generated:new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}),
        to_email:CHEF_EMAIL,
        quote_json:quoteState,
      }).catch((err:any)=>console.error("EmailJS:",err));
    }
  };


  const saveQuote=()=>{
    const state={
      version:1,
      savedAt:new Date().toISOString(),
      rangeStart,rangeEnd,
      excluded:Array.from(excluded),
      extraDates,
      GG,GD,cfgs,cN,cE,cL,
      menus:menus.filter((m:any)=>m.del),
    };
    const json=JSON.stringify(state).replace(/@/g,"[at]").replace(/\.com/g,"[dot]com").replace(/\.is/g,"[dot]is").replace(/\.net/g,"[dot]net").replace(/\.org/g,"[dot]org");  // prevent email/URL auto-linking
    const blob=new Blob([json],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="chef-quote-"+(cN?cN.replace(/\s+/g,"-"):QR)+".json";
    document.body.appendChild(a);a.click();
    document.body.removeChild(a);URL.revokeObjectURL(url);
    // Also email the saved quote
    if((window as any).emailjs){
      const savedayLines=days.map((day:any,i:number)=>{
        const c=calcs[i];
        const typeLabel=day.type==="full"?"Full":day.type==="delivery"?"Delivery":"Partial";
        return fd(day.date)+" | "+typeLabel+" | Svc: "+(c.svcA>0?ISK(c.svcA):"--")+" | Food: "+(c.foodT>0?ISK(c.foodT):"--")+" | Total: "+ISK(c.sub);
      }).join("\n");
      (window as any).emailjs.send(EJS_SVC,EJS_TPL,{
        quote_ref:QR,
        client_name:cN||"--",
        client_email:cE||"--",
        client_location:cL||"--",
        dates:dates.map((d:string)=>fdS(d)).join(", "),
        total:ISK(tots.grand),
        retainer:ISK(tots.ret),
        due_prior:ISK(tots.pre),
        final_balance:ISK(tots.fin),
        day_summary:savedayLines,
        generated:"Saved: "+new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}),
        to_email:CHEF_EMAIL,
        quote_json:json,
      }).catch((err:any)=>console.error("EmailJS:",err));
    }
  };

  const[loadWarning,setLoadWarning]=useState<string|null>(null);

  const migrateDay=(d:any):any=>{
    // All known day fields with defaults — add new fields here as the calculator evolves
    const defaults:any={
      type:"full",gO:"",eS:0,
      bf:false,bfG:"",dinId:null,dinOv:false,dinG:"",
      sDin:false,sCnt:1,lType:"none",lG:"",lBudg:"",
      drkOn:false,drkT:"welcome_cocktail",drkPpp:"",drkG:"",
      ovn:false,ovnN:"",cxN:"",cxS:"",notes:"",
      deliveryKm:"",deliveryTime:"day",
      cateringName:"",cateringPricePph:"",cateringGuests:"",
    };
    const migrated={...defaults,...d};
    return migrated;
  };

  const loadQuote=(e:any)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=(ev:any)=>{
      try{
        const s=JSON.parse(ev.target.result.replace(/\[at\]/g,"@").replace(/\[dot\]/g,"."));
        if(!s.version)throw new Error("Not a valid quote file");
        const warnings:string[]=[];

        // Migrate per-day configs
        const migratedCfgs:any={};
        let pricingFieldsAdded=false;
        const pricingFields=["deliveryKm","deliveryTime","cateringPricePph","cateringGuests","cxS","eS"];
        Object.entries(s.cfgs||{}).forEach(([date,day]:any)=>{
          const migrated=migrateDay(day);
          // Check if any pricing-relevant fields were missing
          pricingFields.forEach(f=>{
            if(day[f]===undefined&&migrated[f]!=="")pricingFieldsAdded=true;
          });
          migratedCfgs[date]=migrated;
        });

        if(pricingFieldsAdded){
          warnings.push("Some pricing fields were not present in this saved quote and have been set to defaults. Please review each day before exporting.");
        }

        // Version upgrade notes
        if(s.version<1){
          warnings.push("This quote was saved with an older version of the calculator.");
        }

        setRangeStart(s.rangeStart||"");
        setRangeEnd(s.rangeEnd||"");
        setExcluded(new Set(s.excluded||[]));
        setExtraDates(s.extraDates||[]);
        setGG(s.GG||DEFG);
        setGD(s.GD||"dinner_3course");
        setCfgs(migratedCfgs);
        setCN(s.cN||"");
        setCE(s.cE||"");
        setCL(s.cL||"");
        if(s.menus?.length){
          setMenus([...DMENUS,...s.menus]);
        }
        setTab("summary");
        setSel(null);
        setLoadWarning(warnings.length>0?warnings.join(" "):null);
      }catch(err){
        alert("Could not load quote file. Make sure it is a valid chef calculator quote.");
      }
    };
    reader.readAsText(file);
    e.target.value="";
  };

  return(
    <div style={{fontFamily:"system-ui,sans-serif",maxWidth:980,margin:"0 auto",padding:"20px 16px",color:"#111827"}}>
      <div style={{marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div>
          <h1 style={{margin:0,fontSize:20,fontWeight:800}}>Private Chef Booking Calculator</h1>
          <p style={{margin:"2px 0 0",color:"#6b7280",fontSize:13}}>Selfoss · All prices incl. 11% VAT · Quote <strong>{QR}</strong></p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <label title="Load a previously saved quote to make adjustments without re-entering all the information." style={{padding:"7px 14px",background:"#f3f4f6",color:"#374151",border:"1px solid #d1d5db",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:5}}>
            <span>↑ Load Quote</span>
            <input type="file" accept=".json" onChange={loadQuote} style={{display:"none"}}/>
          </label>
          {dates.length>0&&<button onClick={saveQuote} title="Save this quote as a file so you can reload it later and make adjustments without re-entering all the information." style={{padding:"7px 14px",background:"#f3f4f6",color:"#374151",border:"1px solid #d1d5db",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>
            ↓ Save Quote
          </button>}
        </div>
      </div>

      {loadWarning&&<div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#92400e",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
        <div><strong>Quote loaded with changes:</strong> {loadWarning}</div>
        <button onClick={()=>setLoadWarning(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#92400e",padding:0,lineHeight:1,flexShrink:0}}>✕</button>
      </div>}

      <div style={{background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:10,padding:"14px 16px",marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>Date Selection</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end",marginBottom:12}}>
          <div><LB t="Range Start"/><input type="date" value={rangeStart} onChange={e=>setRangeStart(e.target.value)} style={{...iS,width:155}}/></div>
          <div><LB t="Range End"/><input type="date" value={rangeEnd} min={rangeStart} onChange={e=>setRangeEnd(e.target.value)} style={{...iS,width:155}}/></div>
          <div style={{color:"#9ca3af",fontSize:12,alignSelf:"center",padding:"0 4px"}}>or add individual dates</div>
          <div style={{display:"flex",gap:6,alignItems:"flex-end"}}>
            <div><LB t="Add Single Date"/><input type="date" value={newExtra} onChange={e=>setNewExtra(e.target.value)} style={{...iS,width:155}}/></div>
            <button onClick={addExtra} disabled={!newExtra} style={{padding:"6px 14px",background:"#111827",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700,opacity:!newExtra?0.4:1,height:32}}>+ Add</button>
          </div>
        </div>
        {rangeDates.length>0&&<div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:"#6b7280",marginBottom:6}}>Uncheck days to exclude (excluded days are free):</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {rangeDates.map((d:string)=>{
              const excl=excluded.has(d),h=getHol(d);
              return <label key={d} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:5,border:"1px solid",fontSize:11,cursor:"pointer",background:excl?"#f9fafb":h?"#fffbeb":"#fff",borderColor:excl?"#e5e7eb":h?"#fcd34d":"#d1d5db",color:excl?"#9ca3af":h?"#92400e":"#374151",textDecoration:excl?"line-through":"none"}}>
                <input type="checkbox" checked={!excl} onChange={()=>toggleExclude(d)} style={{margin:0}}/>
                {fdS(d)}{h?" !":""}
              </label>;
            })}
          </div>
        </div>}
        {extraDates.length>0&&<div style={{marginBottom:8}}>
          <div style={{fontSize:11,color:"#6b7280",marginBottom:5}}>Individual dates:</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {extraDates.map((d:string)=>(
              <span key={d} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:5,border:"1px solid #bfdbfe",fontSize:11,background:"#eff6ff",color:"#1e40af"}}>
                {fdS(d)}<button onClick={()=>removeExtra(d)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"#1e40af",padding:0,lineHeight:1}}>x</button>
              </span>
            ))}
          </div>
        </div>}
        {dates.length>0&&<div style={{fontSize:12,color:"#374151",fontWeight:600,paddingTop:8,borderTop:"1px solid #e5e7eb"}}>
          {dates.length} active day{dates.length!==1?"s":""}: <span style={{fontWeight:400,color:"#6b7280"}}>{dates.map((d:string)=>fdS(d)).join(" · ")}</span>
        </div>}
      </div>

      <div style={{background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:10,padding:"14px 16px",marginBottom:16}}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end",marginBottom:12}}>
          <div>
            <LB t="Default Guests"/>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <button onClick={()=>setGG((g:number)=>Math.max(1,g-1))} style={{width:30,height:30,border:"1px solid #d1d5db",borderRadius:6,background:"#fff",cursor:"pointer",fontSize:16,fontWeight:700}}>-</button>
              <div style={{textAlign:"center",minWidth:30}}><div style={{fontSize:18,fontWeight:800,lineHeight:1}}>{GG}</div><div style={{fontSize:9,color:"#9ca3af"}}>guests</div></div>
              <button onClick={()=>setGG((g:number)=>Math.min(MAXG,g+1))} style={{width:30,height:30,border:"1px solid #d1d5db",borderRadius:6,background:"#fff",cursor:"pointer",fontSize:16,fontWeight:700}}>+</button>
            </div>
            <div style={{fontSize:9,color:"#9ca3af",marginTop:2}}>max {MAXG}</div>
          </div>
          <div style={{minWidth:220}}>
            <LB t="Default Dinner"/>
            <select value={GD} onChange={e=>setGD(e.target.value)} style={iS}>
              <option value="none">No Dinner</option>
              {dinMs.map((m:any)=><option key={m.id} value={m.id}>{m.label} - {mLabel(m)}</option>)}
            </select>
          </div>
        </div>
        <div style={{borderTop:"1px solid #e5e7eb",paddingTop:10,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          <div><LB t="Client Name"/><input value={cN} onChange={e=>setCN(e.target.value)} placeholder="e.g. Jon Sigurdsson" style={iS}/></div>
          <div><LB t="Client Email"/><input type="email" value={cE} onChange={e=>setCE(e.target.value)} placeholder="client@example.com" style={iS}/></div>
          <div><LB t="Event Location"/><input value={cL} onChange={e=>setCL(e.target.value)} placeholder="e.g. Deplar Farm" style={iS}/></div>
        </div>
      </div>

      {dates.length===0&&<div style={{background:"#f9fafb",border:"1px dashed #d1d5db",borderRadius:10,padding:40,textAlign:"center",color:"#9ca3af",fontSize:14}}>Select a date range or add individual dates above to begin.</div>}

      {dates.length>0&&<>
        <div style={{background:"#111827",color:"#fff",borderRadius:10,padding:"14px 20px",marginBottom:16,display:"flex",gap:20,flexWrap:"wrap",alignItems:"center"}}>
          <div><div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1}}>Estimated Total</div><div style={{fontSize:22,fontWeight:800}}>{ISK(tots.grand)}</div></div>
          {[["Retainer (30%)",tots.ret],["Due 14 days prior (80%)",tots.pre],["Final balance",tots.fin]].map(([l,v])=>(
            <div key={l as string} style={{borderLeft:"1px solid #374151",paddingLeft:16}}>
              <div style={{fontSize:10,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1}}>{l}</div>
              <div style={{fontSize:13,fontWeight:700}}>{ISK(v as number)}</div>
            </div>
          ))}
          {calcs.some((c:any)=>c.h)&&<div style={{fontSize:11,color:"#fcd34d"}}>! Holiday rate(s) applied</div>}
          <button onClick={expQ} title="Export a printable PDF quote to share with the client. Also sends a notification email to Arni with the full quote details." style={{marginLeft:"auto",padding:"7px 16px",background:"#fff",color:"#111827",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700}}>Export Quote</button>
        </div>

        <div style={{borderBottom:"1px solid #e5e7eb",marginBottom:16,display:"flex",overflowX:"auto"}}>
          {[["summary","Summary"],["days","Day-by-Day ("+dates.length+")"],["meals","Meals"],["payment","Payment"],["menus","Menus"],["policy","Policy"]].map(([id,l])=><Tab key={id} id={id} l={l}/>)}
        </div>

        {tab==="summary"&&<div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>
              {[["Date",false],["Type",false],["Meals",false],["Service Fee",true],["Food & Bev",true],["Complexity",true],["Day Total",true]].map(([h,r])=>(
                <th key={h as string} style={thS(r as boolean)}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{days.map((day:any,i:number)=>{
              const c=calcs[i],p:string[]=[];
              if(day.bf)p.push("Bfast x"+c.bfG);
              if(c.effDin&&c.effDin!=="none")p.push((mb[c.effDin]?.label||"").replace("Dinner - ","")+" x"+c.dinG+(c.frkOnly?" (no svc)":""));
              if(day.lType!=="none")p.push("Lunch x"+c.lG);
              if(day.drkOn)p.push("Drinks x"+c.drkG);
              const typeBg=day.type==="full"?"#dbeafe":day.type==="delivery"?"#eff6ff":"#fef3c7";
              const typeColor=day.type==="full"?"#1e40af":day.type==="delivery"?"#1e40af":"#92400e";
              const typeLabel=day.type==="full"?"Full":day.type==="delivery"?"Delivery":"Partial";
              return <tr key={day.date} style={{cursor:"pointer"}} onClick={()=>{setTab("days");setSel(day.date);}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f9fafb"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}>
                <td style={tdS(false)}><span style={{fontWeight:600}}>{fd(day.date)}</span>{c.h&&<HolB n={c.h}/>}{extraDates.includes(day.date)&&<span style={{marginLeft:5,fontSize:10,background:"#eff6ff",color:"#1e40af",padding:"1px 5px",borderRadius:3}}>added</span>}</td>
                <td style={tdS(false)}><span style={{padding:"2px 6px",borderRadius:4,fontSize:11,background:typeBg,color:typeColor}}>{typeLabel}</span>{(c.frkOnly||c.isDelivery)&&<div style={{fontSize:10,color:"#7c3aed",marginTop:2}}>No svc fee</div>}</td>
                <td style={{...tdS(false),fontSize:12,color:"#6b7280"}}>{p.join(" · ")||"-"}</td>
                <td style={tdS(true)}>{c.svcA>0?ISK(c.svcA):"-"}{c.minApp&&<div style={{fontSize:10,color:"#f59e0b"}}>min. applied</div>}{c.h&&!c.frkOnly&&!c.isDelivery&&<div style={{fontSize:10,color:"#d97706"}}>x1.9</div>}</td>
                <td style={tdS(true)}>{c.foodT>0?ISK(c.foodT):"-"}</td>
                <td style={tdS(true)}>{c.cx>0?ISK(c.cx):"-"}</td>
                <td style={tdS(true,true)}>{ISK(c.sub)}</td>
              </tr>;
            })}</tbody>
            <tfoot><tr style={{background:"#f9fafb"}}>
              <td colSpan={3} style={{...tdS(false),fontWeight:700}}>TOTAL</td>
              <td style={{...tdS(true),fontWeight:700}}>{ISK(tots.svcT)}</td>
              <td style={{...tdS(true),fontWeight:700}}>{ISK(tots.foodT)}</td>
              <td style={{...tdS(true),fontWeight:700}}>{tots.cxT>0?ISK(tots.cxT):"-"}</td>
              <td style={{...tdS(true),fontWeight:800,fontSize:15}}>{ISK(tots.grand)}</td>
            </tr></tfoot>
          </table>
          <p style={{fontSize:11,color:"#9ca3af",marginTop:6}}>Click any row to configure that day.</p>
        </div>}

        {tab==="days"&&<div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
            {days.map((day:any,i:number)=>{
              const c=calcs[i],act=sel===day.date;
              return <button key={day.date} onClick={()=>setSel(day.date)} style={{padding:"4px 9px",borderRadius:6,border:"1px solid",fontSize:11,cursor:"pointer",fontWeight:act?700:400,background:act?"#111827":c.h?"#fffbeb":"#fff",color:act?"#fff":c.h?"#92400e":"#374151",borderColor:act?"#111827":c.h?"#fcd34d":"#d1d5db"}}>{fdS(day.date)}{c.h?" !":""}</button>;
            })}
          </div>
          {(()=>{
            if(!sel)return <div style={{color:"#9ca3af",fontSize:13}}>Select a day above.</div>;
            const di=days.findIndex((d:any)=>d.date===sel);
            if(di<0)return null;
            const day=days[di],c=calcs[di];
            const u=(f:string,v:any)=>upd(day.date,{[f]:v});
            const single=dates.length===1,wP=single&&day.type==="partial";
            return <div style={{border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden"}}>
              <div style={{background:c.h?"#fffbeb":"#f9fafb",padding:"10px 14px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><span style={{fontWeight:700,fontSize:14}}>{fd(day.date)}</span>{c.h&&<HolB n={c.h}/>}</div>
                <div style={{fontSize:12,color:"#6b7280"}}>Day total (est.): <strong>{ISK(c.sub)}</strong></div>
              </div>
              {wP&&<div style={{margin:"10px 14px 0",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:6,padding:"8px 12px",fontSize:12,color:"#991b1b"}}>Partial not available for single day. <button onClick={()=>u("type","full")} style={{background:"none",border:"none",color:"#991b1b",textDecoration:"underline",cursor:"pointer",fontSize:12,padding:0}}>Revert to Full Day</button></div>}
              <div style={{padding:14,display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div><LB t="Day Type"/>
                      <select value={day.type} onChange={e=>{
                        const newType=e.target.value;
                        if(newType==="delivery"){
                          upd(day.date,{type:"delivery",bf:false,bfG:"",dinId:"none",dinOv:true,dinG:"",eS:0,sDin:false,drkOn:false,deliveryTime:getDeliveryTimeDefault(day.date)});
                        } else {
                          u("type",newType);
                        }
                      }} style={iS}>
                        <option value="full">Full Day (98,000 - min 120,000)</option>
                        <option value="partial">Partial Day (58,800 - min 72,000)</option>
                        <option value="delivery">Meal Delivery / Catering</option>
                      </select>
                    </div>
                    <GIn label={"Guests (def: "+GG+")"} value={day.gO} onChange={(v:string)=>u("gO",v)} inh={GG}/>
                  </div>

                  {day.type==="delivery"&&<div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:12}}>
                    <div style={{fontWeight:600,fontSize:12,marginBottom:8,color:"#1e40af"}}>Driving Fee (optional)</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <div><LB t="Distance (km)"/><input type="number" min={0} value={day.deliveryKm} onChange={e=>u("deliveryKm",e.target.value)} placeholder="e.g. 45" style={iS}/></div>
                      <div><LB t="Rate"/>
                        {getDeliveryTimeDefault(day.date)==="weekend"
                          ?<div style={{padding:"6px 8px",background:"#dbeafe",borderRadius:5,fontSize:12,color:"#1e40af",fontWeight:600}}>
                            Weekend / Holiday rate — {DELIVERY_RATES.weekend.rate} ISK/km + 24% VAT
                            <div style={{fontSize:10,fontWeight:400,marginTop:2}}>Auto-applied — weekends and public holidays always use this rate</div>
                          </div>
                          :<select value={day.deliveryTime} onChange={e=>u("deliveryTime",e.target.value)} style={iS}>
                            <option value="day">{DELIVERY_RATES.day.label} - {DELIVERY_RATES.day.rate} ISK/km</option>
                            <option value="evening">{DELIVERY_RATES.evening.label} - {DELIVERY_RATES.evening.rate} ISK/km</option>
                          </select>
                        }
                      </div>
                    </div>
                    {parseFloat(day.deliveryKm)>0&&<div style={{marginTop:8,fontSize:12,color:"#1e40af"}}>
                      {day.deliveryKm} km x {DELIVERY_RATES[day.deliveryTime]?.rate} ISK + 24% VAT = <strong>{ISK(Math.round(parseFloat(day.deliveryKm)*DELIVERY_RATES[day.deliveryTime]?.rate*(1+DVAT)))}</strong>
                    </div>}
                  </div>}

                  {day.type!=="delivery"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div><LB t="Extra Staff"/><input type="number" min={0} value={day.eS} onChange={e=>u("eS",parseInt(e.target.value)||0)} style={iS}/><div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>58,800 ISK/person</div></div>
                    <div><LB t="Overnight"/><label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12,marginTop:6}}><input type="checkbox" checked={day.ovn} onChange={e=>u("ovn",e.target.checked)}/><span>Required</span></label>{day.ovn&&<input value={day.ovnN} onChange={e=>u("ovnN",e.target.value)} placeholder="e.g. Guest house" style={{...iS,marginTop:4,fontSize:11}}/>}</div>
                  </div>}

                  <div style={{background:"#f9fafb",borderRadius:8,padding:10}}>
                    <div style={{fontWeight:600,fontSize:12,marginBottom:8}}>Meal Selection</div>
                    {day.type!=="delivery"?<>
                    <div style={{marginBottom:10,paddingBottom:10,borderBottom:"1px solid #e5e7eb"}}>
                      <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12,marginBottom:4}}><input type="checkbox" checked={day.bf} onChange={e=>u("bf",e.target.checked)}/><strong>Breakfast</strong><span style={{color:"#9ca3af",fontSize:10}}>est. {ISK(afull(mb["breakfast"]?.base||2000))}/pax</span></label>
                      {day.bf&&<div style={{paddingLeft:16,borderLeft:"2px solid #e5e7eb"}}><GIn label="Guests" value={day.bfG} onChange={(v:string)=>u("bfG",v)} inh={c.dG} sub/></div>}
                    </div>
                    <div style={{marginBottom:10,paddingBottom:10,borderBottom:"1px solid #e5e7eb"}}>
                      <div style={{fontWeight:600,fontSize:12,marginBottom:4}}>Dinner</div>
                      <div style={{display:"flex",gap:5,marginBottom:4}}>
                        <select value={day.dinOv?(day.dinId||"none"):GD} onChange={e=>upd(day.date,{dinId:e.target.value,dinOv:true})} style={{...iS,borderColor:day.dinOv?"#f59e0b":"#e5e7eb"}}>
                          <option value="none">No Dinner</option>
                          {dinMs.map((m:any)=><option key={m.id} value={m.id}>{m.label} - {mLabel(m)}</option>)}
                        </select>
                        {day.dinOv&&<button onClick={()=>upd(day.date,{dinOv:false,dinId:null})} style={{padding:"3px 7px",border:"1px solid #f59e0b",borderRadius:5,background:"#fff",color:"#f59e0b",cursor:"pointer",fontSize:11}}>x</button>}
                      </div>
                      {c.frkOnly&&<div style={{marginTop:4,background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:5,padding:"6px 8px",fontSize:11,color:"#92400e"}}>Froken only - no chef service fee. Flat {ISK(FRKRATE)}/pax.</div>}
                      {c.effDin&&c.effDin!=="none"&&<div style={{paddingLeft:16,borderLeft:"2px solid #e5e7eb",marginTop:6}}><GIn label="Guests" value={day.dinG} onChange={(v:string)=>u("dinG",v)} inh={c.dG} sub/></div>}
                    </div>
                    </>:
                    <div style={{marginBottom:10,paddingBottom:10,borderBottom:"1px solid #e5e7eb"}}>
                      <div style={{fontWeight:600,fontSize:12,marginBottom:6,color:"#1e40af"}}>Catering / Delivery Item</div>
                      <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:6,padding:"8px 10px",fontSize:11,color:"#991b1b",marginBottom:8}}>
                        <strong>Admin use only.</strong> Custom catering quotes of this type must be arranged directly through Arni. Clients requiring catering services should contact us for a personalised quote.
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        <div><LB t="Description" s/><input value={day.cateringName||""} onChange={e=>u("cateringName",e.target.value)} placeholder="e.g. BBQ buffet, Pasta dinner delivery" style={iS}/></div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                          <div><LB t="Fixed price per head (ISK, incl. VAT)" s/><input type="number" min={0} value={day.cateringPricePph||""} onChange={e=>u("cateringPricePph",e.target.value)} placeholder="e.g. 3990" style={iS}/></div>
                          <GIn label="Guests" value={day.cateringGuests||""} onChange={(v:string)=>u("cateringGuests",v)} inh={c.dG} sub/>
                        </div>
                        {parseFloat(day.cateringPricePph)>0&&rG(day.cateringGuests,c.dG)>0&&<div style={{fontSize:11,color:"#1e40af",background:"#eff6ff",padding:"6px 8px",borderRadius:5}}>
                          {ISK(parseFloat(day.cateringPricePph)*rG(day.cateringGuests,c.dG))} total (flat rate, incl. VAT)
                        </div>}
                      </div>
                    </div>
                    }
                    <div style={{marginBottom:10,paddingBottom:10,borderBottom:"1px solid #e5e7eb"}}>
                      <div style={{fontWeight:600,fontSize:12,marginBottom:4}}>Lunch</div>
                      <select value={day.lType} onChange={e=>u("lType",e.target.value)} style={{...iS,marginBottom:4}}>
                        <option value="none">No Lunch</option>
                        <option value="onsite">On-Site Lunch - 60,000 ISK + ingredients</option>
                        <option value="box">Takeaway Box - {ISK(BOX)}/pax (flat)</option>
                        <option value="custom">Custom Budget</option>
                      </select>
                      {day.lType!=="none"&&<div style={{paddingLeft:16,borderLeft:"2px solid #e5e7eb",display:"flex",flexDirection:"column",gap:4}}>
                        <GIn label="Guests" value={day.lG} onChange={(v:string)=>u("lG",v)} inh={c.dG} sub/>
                        {day.lType==="custom"&&<div><LB t="Food cost excl. VAT and markup" s/><input type="number" min={0} value={day.lBudg} onChange={e=>u("lBudg",e.target.value)} placeholder="e.g. 20000" style={{...iS,width:130}}/></div>}
                      </div>}
                    </div>
                    {day.type!=="delivery"&&<>
                    <div style={{marginBottom:10,paddingBottom:10,borderBottom:"1px solid #e5e7eb"}}>
                      <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12,marginBottom:4}}><input type="checkbox" checked={day.drkOn} onChange={e=>u("drkOn",e.target.checked)}/><strong>Drinks</strong></label>
                      {day.drkOn&&<div style={{paddingLeft:16,borderLeft:"2px solid #e5e7eb",display:"flex",flexDirection:"column",gap:4}}>
                        <select value={day.drkT} onChange={e=>u("drkT",e.target.value)} style={iS}>{Object.entries(DRK).map(([k,v]:any)=><option key={k} value={k}>{v.label}</option>)}</select>
                        {DRK[day.drkT]&&<div style={{fontSize:10,color:day.drkT==="full_bar"?"#dc2626":"#9ca3af"}}>{DRK[day.drkT].note}</div>}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                          <div><LB t={"Budget/pax (def: "+ISK(DRK[day.drkT]?.def||0)+")"} s/><input type="number" min={0} value={day.drkPpp} onChange={e=>u("drkPpp",e.target.value)} placeholder={String(DRK[day.drkT]?.def||"")} style={iS}/></div>
                          <GIn label="Guests" value={day.drkG} onChange={(v:string)=>u("drkG",v)} inh={c.dG} sub/>
                        </div>
                      </div>}
                    </div>
                    <div style={{marginBottom:10,paddingBottom:10,borderBottom:"1px solid #e5e7eb"}}>
                      <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12,marginBottom:4}}><input type="checkbox" checked={day.sDin} onChange={e=>u("sDin",e.target.checked)}/><strong>Staff / Host Dinner</strong><span style={{color:"#9ca3af",fontSize:10}}>Flat {ISK(mb["staff_dinner"]?.base||2900)}/pax</span></label>
                      {day.sDin&&<div style={{paddingLeft:16,borderLeft:"2px solid #e5e7eb"}}><LB t="Count" s/><input type="number" min={1} value={day.sCnt} onChange={e=>u("sCnt",parseInt(e.target.value)||1)} style={{...iS,width:60}}/></div>}
                    </div>
                    </>}
                    <div>
                      <div style={{fontWeight:600,fontSize:12,marginBottom:4}}>Complexity Surcharge</div>
                      <input value={day.cxN} onChange={e=>u("cxN",e.target.value)} placeholder="e.g. 4 dietary menus" style={{...iS,marginBottom:4}}/>
                      <input type="number" min={0} value={day.cxS} onChange={e=>u("cxS",e.target.value)} placeholder="Surcharge (ISK)" style={{...iS,width:140}}/>
                    </div>
                  </div>
                  <div><LB t="Notes"/><input value={day.notes} onChange={e=>u("notes",e.target.value)} placeholder="e.g. Arrival evening" style={iS}/></div>
                </div>
                <div style={{background:"#f9fafb",borderRadius:8,padding:12}}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>Day Breakdown</div>
                  <div style={{fontSize:10,color:"#6b7280",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Service Fee</div>
                  {c.frkOnly?<div style={{fontSize:12,color:"#7c3aed",padding:"3px 0"}}>No service fee (Froken only)</div>
                  :c.isDelivery?<div style={{fontSize:12,color:"#1e40af",padding:"3px 0"}}>No service fee (Meal Delivery / Catering)</div>
                  :[{l:c.frkBf?"Chef (breakfast, partial)":"Chef fee",v:c.chef,note:c.h?"x1.9 holiday":null},
                    ...(c.staff>0?[{l:"Extra staff ("+day.eS+"x) - 58,800 ISK each",v:c.staff,note:c.h?"x1.9":null}]:[]),
                    ...(c.minApp?[{l:"Min. spend top-up",v:c.ms,note:"below min. "+ISK(c.min),warn:true}]:[]),
                  ].map((r:any,i:number)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"1px solid #e5e7eb",fontSize:12}}>
                      <span>{r.l}{r.note&&<span style={{color:r.warn?"#f59e0b":"#9ca3af",fontSize:10,marginLeft:4}}>{r.note}</span>}</span>
                      <span>{ISK(r.v)}</span>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontWeight:700,fontSize:12}}><span>Service total</span><span>{c.svcA>0?ISK(c.svcA):"-"}</span></div>
                  {c.lines.length>0&&<>
                    <div style={{fontSize:10,color:"#6b7280",textTransform:"uppercase",letterSpacing:.5,margin:"8px 0 4px"}}>Food & Bev <span style={{color:"#f59e0b",fontSize:9,textTransform:"none"}}>estimates</span></div>
                    {c.lines.map((l:any,i:number)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"1px solid #e5e7eb",fontSize:11}}>
                        <span>{l.label} x{l.pax}{l.isFixed&&<span style={{color:"#9ca3af",fontSize:9}}> (flat)</span>}</span>
                        <span style={{fontWeight:600}}>{ISK(l.full)}</span>
                      </div>
                    ))}
                    {c.lSvc>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:11,color:"#6b7280"}}><span>Lunch service fee</span><span>{ISK(c.lSvc)}</span></div>}
                    <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0 0",fontWeight:700,fontSize:12,borderTop:"1px solid #d1d5db",marginTop:3}}><span>Food total (est.)</span><span>{ISK(c.foodT+c.lSvc)}</span></div>
                  </>}
                  {c.deliveryFee>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12,borderTop:"1px solid #e5e7eb",marginTop:3,color:"#1e40af"}}><span>Delivery fee ({c.dkm} km x {c.drate} ISK + 24% VAT)</span><span style={{fontWeight:600}}>{ISK(c.deliveryFee)}</span></div>}
                  {c.cx>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12,borderTop:"1px solid #e5e7eb",marginTop:3,color:"#d97706"}}><span>Complexity surcharge</span><span>{ISK(c.cx)}</span></div>}
                  <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0 0",fontWeight:800,fontSize:14,borderTop:"2px solid #d1d5db",marginTop:6}}><span>Day Total (est.)</span><span>{ISK(c.sub)}</span></div>
                </div>
              </div>
            </div>;
          })()}
        </div>}

        {tab==="meals"&&<div>
          <h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:700}}>Meal Overview - All Days</h3>
          {Object.keys(tots.mMap).length===0?<p style={{color:"#9ca3af",fontSize:13}}>No meals configured yet.</p>:
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{[["Meal",false],["Days",true],["Pax",true],["Base",true],["incl. VAT",true],["Final",true]].map(([h,r])=><th key={h as string} style={thS(r as boolean)}>{h}</th>)}</tr></thead>
            <tbody>{Object.entries(tots.mMap).map(([k,m]:any)=>(
              <tr key={k}>
                <td style={tdS(false)}>{m.label}{m.isFixed&&<span style={{color:"#9ca3af",fontSize:10}}> (flat)</span>}</td>
                <td style={tdS(true)}>{m.days}x</td><td style={tdS(true)}>{m.pax}</td>
                <td style={tdS(true)}>{m.isFixed?"-":ISK(m.base)}</td>
                <td style={{...tdS(true),color:"#9ca3af"}}>{m.isFixed?"-":ISK(m.vatC)}</td>
                <td style={{...tdS(true),fontWeight:700}}>{ISK(m.full)}</td>
              </tr>
            ))}</tbody>
            <tfoot><tr style={{background:"#f9fafb"}}>
              <td colSpan={3} style={{...tdS(false),fontWeight:700}}>TOTAL (est.)</td>
              <td style={{...tdS(true),fontWeight:700}}>{ISK(Object.values(tots.mMap).filter((m:any)=>!m.isFixed).reduce((s:number,m:any)=>s+m.base,0))}</td>
              <td style={{...tdS(true),color:"#9ca3af",fontWeight:700}}>{ISK(Object.values(tots.mMap).filter((m:any)=>!m.isFixed).reduce((s:number,m:any)=>s+m.vatC,0))}</td>
              <td style={{...tdS(true),fontWeight:800,fontSize:13}}>{ISK(tots.foodT)}</td>
            </tr></tfoot>
          </table>}
        </div>}

        {tab==="payment"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <div>
            <div style={{fontWeight:700,marginBottom:10}}>Payment Schedule</div>
            {[["Estimated grand total",tots.grand,true],["30% Retainer (non-refundable, due on booking)",tots.ret,false],["Additional pre-payment (due 14 days before)",tots.pre-tots.ret,false],["Total due 14 days before event (80%)",tots.pre,true],["Final balance - invoiced within 7 days post-event",tots.fin,false]].map(([l,v,b])=>(
              <div key={l as string} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f3f4f6",fontWeight:b?700:400}}><span style={{fontSize:12}}>{l}</span><span style={{fontSize:12}}>{ISK(v as number)}</span></div>
            ))}
          </div>
          <div>
            <div style={{fontWeight:700,marginBottom:10}}>Cancellation Policy</div>
            {tots.can?<div style={{background:"#f9fafb",borderRadius:8,padding:12,borderLeft:"3px solid "+tots.can.c}}>
              <div style={{fontWeight:700,color:tots.can.c,marginBottom:4,fontSize:12}}>{tots.can.l}</div>
              <div style={{fontSize:12}}>{tots.can.t}</div>
            </div>:<div style={{background:"#f9fafb",borderRadius:8,padding:12,color:"#9ca3af",fontSize:12}}>Set dates to see the applicable policy.</div>}
          </div>
        </div>}

        {tab==="menus"&&<div>
          <div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#92400e"}}>
            Estimates only - final invoice based on actual cost of goods + 11% VAT + 30% markup. Froken Selfoss, Staff Dinner and Lunch Box are flat rates - no additional markup.
          </div>
          {Object.entries(CATS).map(([cat,catL])=>{
            const cm=menus.filter((m:any)=>m.cat===cat);if(!cm.length)return null;
            return <div key={cat} style={{marginBottom:22}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:8,borderBottom:"2px solid #e5e7eb",paddingBottom:5}}>{catL as string}</div>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{[["Item",false],["Base/pax",true],["incl. VAT",true],["Final",true],["",false]].map(([h,r])=><th key={h as string} style={thS(r as boolean)}>{h}</th>)}</tr></thead>
                <tbody>{cm.map((m:any)=>{
                  const def=DMENUS.find((d:any)=>d.id===m.id)?.base,chg=def!==undefined&&m.base!==def;
                  const flat=FLATIDS.includes(m.id)||m.fixed===true;
                  return <tr key={m.id}>
                    <td style={tdS(false)}><div style={{fontWeight:500}}>{m.label}</div>{m.note&&<div style={{fontSize:10,color:"#9ca3af"}}>{m.note}</div>}{m.fixed&&!FLATIDS.includes(m.id)&&<div style={{fontSize:10,color:"#7c3aed"}}>Fixed price (no VAT/markup)</div>}</td>
                    <td style={{...tdS(true),width:200}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:5}}>
                        {chg&&<button onClick={()=>rstM(m.id)} style={{fontSize:9,padding:"1px 5px",border:"1px solid #d1d5db",borderRadius:4,background:"#fff",cursor:"pointer",color:"#6b7280"}}>reset</button>}
                        <div style={{display:"flex",alignItems:"center",border:"1px solid #d1d5db",borderRadius:5,overflow:"hidden",background:"#fff"}}>
                          <input type="number" min={0} value={m.base} onChange={e=>updM(m.id,"base",parseFloat(e.target.value)||0)} style={{border:"none",outline:"none",padding:"4px 6px",width:75,fontSize:12,textAlign:"right"}}/>
                          <span style={{padding:"0 5px",background:"#f9fafb",borderLeft:"1px solid #e5e7eb",fontSize:10,color:"#6b7280"}}>ISK</span>
                        </div>
                      </div>
                      {chg&&<div style={{fontSize:9,color:"#f59e0b",textAlign:"right",marginTop:2}}>def: {ISK(def)}</div>}
                    </td>
                    <td style={{...tdS(true),color:"#6b7280"}}>{flat?"Flat incl. VAT":ISK(avat(m.base))}</td>
                    <td style={{...tdS(true),fontWeight:700}}>{flat?ISK(m.base)+" (flat)":ISK(afull(m.base))}</td>
                    <td style={{textAlign:"right",padding:"7px 10px"}}>
                      <div style={{display:"flex",gap:5,justifyContent:"flex-end",alignItems:"center"}}>
                        <input value={m.label} onChange={e=>updM(m.id,"label",e.target.value)} style={{...iS,width:160,fontSize:11,padding:"3px 6px"}}/>
                        {m.del&&<button onClick={()=>setMenus((ms:any[])=>ms.filter((x:any)=>x.id!==m.id))} style={{padding:"2px 7px",border:"1px solid #fca5a5",borderRadius:4,background:"#fff",color:"#dc2626",cursor:"pointer",fontSize:11}}>x</button>}
                      </div>
                    </td>
                  </tr>;
                })}</tbody>
              </table>
            </div>;
          })}
          <div style={{border:"1px dashed #d1d5db",borderRadius:8,padding:12,background:"#fafafa"}}>
            <div style={{fontWeight:700,fontSize:12,marginBottom:8}}>Add Custom Menu Item</div>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr auto",gap:8,alignItems:"flex-end"}}>
              <div><LB t="Name"/><input value={nm.label} onChange={e=>setNm((p:any)=>({...p,label:e.target.value}))} placeholder="e.g. Tasting menu" style={iS}/></div>
              <div><LB t="Category"/><select value={nm.cat} onChange={e=>setNm((p:any)=>({...p,cat:e.target.value}))} style={iS}>{Object.entries(CATS).map(([k,v])=><option key={k} value={k}>{v as string}</option>)}</select></div>
              <div><LB t="Base/pax (ISK)"/><input type="number" min={0} value={nm.base} onChange={e=>setNm((p:any)=>({...p,base:e.target.value}))} placeholder="5000" style={iS}/></div>
              <div><LB t="Note"/><input value={nm.note} onChange={e=>setNm((p:any)=>({...p,note:e.target.value}))} placeholder="optional" style={iS}/></div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <LB t="Fixed price?"/>
                <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:11,marginTop:2}}>
                  <input type="checkbox" checked={nm.fixed} onChange={e=>setNm((p:any)=>({...p,fixed:e.target.checked}))}/>
                  <span>Flat (no VAT/markup)</span>
                </label>
              </div>
              <button onClick={addM} disabled={!nm.label.trim()||!nm.base} style={{padding:"6px 14px",background:"#111827",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600,opacity:(!nm.label.trim()||!nm.base)?0.4:1}}>+ Add</button>
            </div>
          </div>
        </div>}

        {tab==="policy"&&<div style={{maxWidth:680,fontSize:13,lineHeight:1.8,color:"#374151"}}>
          {[
            {n:"1. Service Fee Structure",c:<><p><strong>Daily Service Fee:</strong> 98,000 ISK per day (incl. 11% VAT). Includes menu planning, sourcing, preparation, cooking, service, and travel within 30 min of Selfoss.</p><p><strong>Public Holidays:</strong> 1.9x the daily rate - New Year's Day (1 Jan), Maundy Thursday, Good Friday, Easter Sunday, Ascension Day, Pentecost, Whit Monday, First Day of Summer, Labour Day (1 May), National Day (17 Jun), Commerce Day (1st Mon in Aug), Christmas Eve (24 Dec), Christmas Day (25 Dec), New Year's Eve (31 Dec).</p><p><strong>Additional Staff:</strong> 58,800 ISK per person per day (60% of full daily rate), regardless of day type. Holiday multiplier applies on public holidays.</p><p style={{fontSize:11,color:"#6b7280",borderLeft:"3px solid #e5e7eb",paddingLeft:10,marginTop:8}}><em>Staff/Host Dinner: Lodge management only - flat 2,900 ISK/pax (incl. VAT), no markup or holiday surcharge.</em></p></>},
            {n:"2. Multi-Day & Non-Consecutive Bookings",c:<><p>Partial days billed at 60% of daily fee (58,800 ISK), minimum 72,000 ISK. Single-day bookings always at full rate, minimum 120,000 ISK.</p><p>For non-consecutive bookings, each booked day is priced independently. Days not booked incur no charge.</p></>},
            {n:"3. Meal Delivery / Catering",c:<><p>Meal Delivery and Catering days carry no chef service fee and no minimum spend. Food items are charged at fixed price (flat rate, incl. VAT - no additional markup).</p><p><strong>Delivery fee:</strong> Dagur (07:00-17:00): 165 ISK/km, Kvold (17:00-00:00): 175 ISK/km, Helgar: 190 ISK/km. All rates + 24% VAT.</p></>},
            {n:"4. Food & Beverage Pricing",c:<p>Ingredient cost (incl. VAT) + 30% service markup. Final costs calculated after the event based on actual purchases.</p>},
            {n:"5. Minimum Spend",c:<><p>Applies to total day spend (service + food + beverages).</p><ul style={{margin:"4px 0 8px",paddingLeft:20}}><li>Full day: <strong>120,000 ISK</strong></li><li>Partial day: <strong>72,000 ISK</strong></li><li>Froken Selfoss only or Meal Delivery: <strong>no minimum</strong></li></ul></>},
            {n:"6. Froken Selfoss - Partner Restaurant",c:<><p>15% group discount on current set menu. See <a href="https://www.frokenselfoss.is" target="_blank" style={{color:"#2563eb"}}>frokenselfoss.is</a> for current prices. Flat pass-through - no additional VAT or markup.</p><ul style={{margin:"4px 0",paddingLeft:20}}><li>Froken dinner only: no service fee, no minimum</li><li>Breakfast + Froken: partial-day service fee for breakfast only</li></ul></>},
            {n:"7. Travel & Overnight",c:<p>Travel within 30 min of Selfoss included. Overnight required if breakfast before 08:30 and location is 30+ min away. Accommodation invoiced at cost.</p>},
            {n:"8. Optional Add-Ons",c:<><p><strong>On-Site Lunch:</strong> 60,000 ISK service fee + ingredient cost (incl. VAT + 30% markup).</p><p><strong>Takeaway Lunch Box:</strong> 3,800 ISK/pax (flat rate, incl. VAT). Includes main, juice, energy bar and sweet treat, fruit, and water.</p><p><strong>Drinks:</strong> Ingredient cost (incl. VAT) + 30% markup. Welcome cocktail (est. 800 ISK/pax) and wine pairing served by chef. Full bar requires dedicated bartender (58,800 ISK/day).</p></>},
            {n:"9. Booking & Payment Terms",c:<><p><strong>Retainer:</strong> 30% non-refundable, due on booking.</p><p><strong>Pre-event:</strong> 80% due 14 days before the first event day.</p><p><strong>Final:</strong> Balance invoiced within 7 days post-event, due 7 days from invoice.</p></>},
            {n:"10. Cancellation & Rescheduling",c:(<table style={{borderCollapse:"collapse",width:"100%",fontSize:12}}>
              <thead><tr style={{background:"#f9fafb"}}>{["Timing","Cancellation","Rescheduling"].map(h=><th key={h} style={{padding:"7px 10px",textAlign:"left",borderBottom:"1px solid #e5e7eb",fontWeight:600}}>{h}</th>)}</tr></thead>
              <tbody>{[["30+ days","Retainer non-refundable. All other payments refunded.","Free if ingredients not purchased."],["14-30 days","Retainer non-refundable. 50% of prepayment refundable if ingredients not purchased.","Free if ingredients not purchased."],["Within 14 days","All payments non-refundable. Staff must be paid per union rules.","Case-by-case. Staff compensation required."]].map(([t,c,r])=><tr key={t}><td style={{padding:"7px 10px",borderBottom:"1px solid #f3f4f6",fontWeight:500}}>{t}</td><td style={{padding:"7px 10px",borderBottom:"1px solid #f3f4f6"}}>{c}</td><td style={{padding:"7px 10px",borderBottom:"1px solid #f3f4f6"}}>{r}</td></tr>)}</tbody>
            </table>)},
            {n:"11. Force Majeure",c:<p>In case of chef illness we will make every effort to arrange a replacement. Severe weather, road closures, or supply chain disruptions handled collaboratively - rescheduling at no charge where possible. No service fee charged for any day on which service is not delivered.</p>},
            {n:"12. Event Logistics",c:<p>A functional oven and stove are required - please disclose if unavailable. Luxury lodges with professional kitchen facilities are our standard working environment.</p>},
          ].map(({n,c})=><div key={n} style={{marginBottom:22}}><h3 style={{margin:"0 0 6px",fontSize:14,fontWeight:700,color:"#111827"}}>{n}</h3>{c}</div>)}
        </div>}
      </>}
    </div>
  );
}
