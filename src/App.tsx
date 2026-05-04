import { useState, useMemo, useEffect } from "react";

const DAILY_FEE=98000, PARTIAL_RATE=0.6, HOL_MULT=1.9;
const VAT=0.11, MKP=0.30;
const MIN_FULL=120000, MIN_PARTIAL=72000;
const LUNCH_SVC=60000, BOX_FIXED=3800;
const MAX_GUESTS=20, MAX_DAYS=30;
const DEFAULT_GUESTS=8;
const FROEKEN_ID="frokenselfoss";
const FROEKEN_RETAIL_PRICE=13990;
const FROEKEN_DISCOUNT=0.15;
const FROEKEN_RATE=Math.round(FROEKEN_RETAIL_PRICE*(1-FROEKEN_DISCOUNT));

const DRINKS_OPTIONS={
  welcome_cocktail:{label:"Welcome Cocktail",defaultBudget:554,note:"Chef can serve · no extra staff needed"},
  wine_pairing:{label:"Wine Pairing",defaultBudget:3000,note:"Chef can serve · no extra staff needed"},
  full_bar:{label:"Full Bar Service",defaultBudget:4000,note:"Bartender/waiter required — add extra staff above"},
};

const DEFAULT_MENUS=[
  {id:"breakfast",label:"Breakfast",base:2000,category:"breakfast",deletable:false},
  {id:"dinner_home",label:"Dinner – Home Style (1-course)",base:2200,category:"dinner",deletable:false},
  {id:"dinner_2course",label:"Dinner – 2 Course",base:3100,category:"dinner",deletable:false},
  {id:"dinner_3course",label:"Dinner – 3 Course Gourmet",base:4000,category:"dinner",deletable:false},
  {id:FROEKEN_ID,label:"Fröken Selfoss – 3 Course Set",base:FROEKEN_RATE,category:"dinner",note:"Partner restaurant · flat rate · 15% group discount · no chef service fee",deletable:false},
  {id:"staff_dinner",label:"Staff / Host Dinner",base:2900,category:"other",note:"Flat rate · no VAT or markup · lodge management only",deletable:false},
  {id:"lunch_onsite",label:"Lunch On-Site",base:1200,category:"lunch",note:"Ingredient est. only — 60,000 ISK service fee added separately per day",deletable:false},
  {id:"lunch_box",label:"Takeaway Lunch Box",base:3800,category:"lunch",note:"Fixed flat rate incl. VAT — no additional markup",deletable:false},
];
const CAT_LABELS={breakfast:"Breakfast",dinner:"Dinner",lunch:"Lunch",other:"Other",custom:"Custom"};

const addVat=b=>b*(1+VAT);
const addFull=b=>b*(1+VAT)*(1+MKP);
const fmt=n=>new Intl.NumberFormat("is-IS").format(Math.round(n));
const ISK=n=>fmt(n)+" ISK";
const fmtDate=s=>s?new Date(s+"T12:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"}):"";
const uid=()=>"c_"+Math.random().toString(36).slice(2,8);
const clamp=(v,max)=>Math.min(Math.max(parseInt(v)||0,0),max);
const resolveG=(ov,fb)=>{const v=parseInt(ov);return(!ov||isNaN(v)||v<=0)?fb:Math.min(v,MAX_GUESTS);};
const quoteRef="REF-"+Date.now().toString(36).toUpperCase();

function getEaster(y){
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,
    f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,
    i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),
    mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;
  return new Date(y,mo-1,da);
}
function addD(d,n){const r=new Date(d);r.setDate(r.getDate()+n);return r;}
function sameD(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
function getHoliday(s){
  if(!s)return null;
  const[y,mo,da]=s.split("-").map(Number),m=mo-1,D=new Date(y,m,da);
  if(m===11&&da===24)return"Christmas Eve";
  if(m===11&&da===25)return"Christmas Day";
  if(m===11&&da===31)return"New Year's Eve";
  if(m===0&&da===1)return"New Year's Day";
  if(m===5&&da===17)return"National Day";
  const aug1=new Date(y,7,1),fma=new Date(y,7,aug1.getDay()===1?1:1+(8-aug1.getDay())%7);
  if(m===7&&da===fma.getDate())return"Frídagur verslunarmanna";
  const E=getEaster(y);
  if(sameD(D,addD(E,-2)))return"Good Friday";
  if(sameD(D,E))return"Easter Sunday";
  if(sameD(D,addD(E,49)))return"Pentecost";
  return null;
}

function genDates(s,e){
  if(!s||!e)return[];
  const sd=new Date(s+"T12:00:00"),ed=new Date(e+"T12:00:00");
  if(ed<sd)return[];
  const out=[],cur=new Date(sd);
  while(cur<=ed&&out.length<MAX_DAYS){out.push(cur.toISOString().split("T")[0]);cur.setDate(cur.getDate()+1);}
  return out;
}
function mkDef(date,i,n){
  const first=i===0&&n>1,last=i===n-1&&n>1;
  return{date,type:(first||last)?"partial":"full",guestsOverride:"",extraStaff:0,
    breakfast:!first,breakfastGuests:"",
    dinnerMenuId:last?"none":null,dinnerMenuOverridden:last,dinnerGuests:"",
    staffDinner:false,staffCount:1,
    lunchType:"none",lunchGuests:"",customLunchBudget:"",
    drinksEnabled:false,drinksType:"welcome_cocktail",drinksBudgetPerPax:"",drinksGuests:"",
    overnight:false,overnightNote:"",complexityNote:"",complexitySurcharge:"",notes:""};
}

function calcDay(day,globalGuests,globalDinner,menus){
  const hol=getHoliday(day.date),hm=hol?HOL_MULT:1;
  const part=day.type==="partial",tr=part?PARTIAL_RATE:1;
  const menuById=Object.fromEntries(menus.map(m=>[m.id,m]));
  const dayG=resolveG(day.guestsOverride,globalGuests);
  const bfastG=resolveG(day.breakfastGuests,dayG);
  const dinnerG=resolveG(day.dinnerGuests,dayG);
  const lunchG=resolveG(day.lunchGuests,dayG);
  const drinksG=resolveG(day.drinksGuests,dayG);
  const es=parseInt(day.extraStaff)||0;
  const effDinnerId=day.dinnerMenuOverridden?day.dinnerMenuId:globalDinner;
  const isFroeken=effDinnerId===FROEKEN_ID;
  const froekenWithBfast=isFroeken&&day.breakfast;
  const froekenOnly=isFroeken&&!day.breakfast&&day.lunchType==="none";
  let svcRate=froekenOnly?0:froekenWithBfast?PARTIAL_RATE*hm:tr*hm;
  const chefFee=DAILY_FEE*svcRate;
  // Staff always at full-day rate × 60%. Only exception: Fröken-only day = no staff fee.
  const staffFee=es*DAILY_FEE*0.6*(froekenOnly?0:hm);
  const svcRaw=chefFee+staffFee;
  const min=froekenOnly?0:(part?MIN_PARTIAL:MIN_FULL);
  const lines=[];
  const pushMenu=(id,pax,flatRate=false)=>{
    const m=menuById[id];if(!m||pax<=0)return;
    const base=m.base*pax;
    if(flatRate)lines.push({key:id,label:m.label,pax,base,vatCost:null,full:base,note:m.note||null,isFixed:true});
    else lines.push({key:id,label:m.label,pax,base,vatCost:addVat(base),full:addFull(base),note:m.note||null,isFixed:false});
  };
  if(day.breakfast&&bfastG>0)pushMenu("breakfast",bfastG);
  if(effDinnerId&&effDinnerId!=="none"&&dinnerG>0)pushMenu(effDinnerId,dinnerG,isFroeken);
  if(day.staffDinner){const sc=parseInt(day.staffCount)||0;if(sc>0)pushMenu("staff_dinner",sc,true);}
  let lunchSvcFee=0;
  if(day.lunchType==="onsite"&&lunchG>0){lunchSvcFee=LUNCH_SVC;pushMenu("lunch_onsite",lunchG);}
  else if(day.lunchType==="box"&&lunchG>0){
    const boxBase=BOX_FIXED*lunchG;
    lines.push({key:"lunch_box",label:"Takeaway Lunch Box",pax:lunchG,base:boxBase,vatCost:null,full:boxBase,note:"Fixed flat rate incl. VAT",isFixed:true});
  }else if(day.lunchType==="custom"){
    const cb=parseFloat(day.customLunchBudget)||0;
    if(cb>0)lines.push({key:"lunch_custom",label:"Lunch (Custom)",pax:lunchG||dayG,base:cb,vatCost:addVat(cb),full:addFull(cb),note:"Custom budget",isFixed:false});
  }
  if(day.drinksEnabled&&drinksG>0){
    const opt=DRINKS_OPTIONS[day.drinksType];
    const dppp=parseFloat(day.drinksBudgetPerPax)||opt?.defaultBudget||0;
    const dbase=dppp*drinksG;
    lines.push({key:"drinks_"+day.drinksType,label:`Drinks – ${opt?.label||""}`,pax:drinksG,base:dbase,vatCost:addVat(dbase),full:addFull(dbase),note:opt?.note||null,isFixed:false});
  }
  const complexity=parseFloat(day.complexitySurcharge)||0;
  const foodTotal=lines.reduce((s,l)=>s+l.full,0);
  const dayRaw=svcRaw+lunchSvcFee+foodTotal+complexity;
  const minShortfall=Math.max(0,min-dayRaw);
  const svcApplied=svcRaw+minShortfall;
  const minApplied=minShortfall>0;
  const subtotal=svcApplied+lunchSvcFee+foodTotal+complexity;
  return{chefFee,staffFee,svcRaw,svcApplied,minApplied,minShortfall,min,hol,hm,
    lines,lunchSvcFee,foodTotal,subtotal,complexity,
    dayG,bfastG,dinnerG,lunchG,drinksG,effDinnerId,isFroeken,froekenOnly,froekenWithBfast};
}

const iS={border:"1px solid #e5e7eb",borderRadius:5,padding:"5px 8px",fontSize:13,width:"100%",boxSizing:"border-box",outline:"none",background:"#fff"};
const thS=r=>({padding:"8px 10px",fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:.5,background:"#f9fafb",borderBottom:"1px solid #e5e7eb",textAlign:r?"right":"left"});
const tdS=(r,b)=>({padding:"8px 10px",fontSize:b?14:13,fontWeight:b?800:400,borderBottom:"1px solid #f3f4f6",textAlign:r?"right":"left",fontVariantNumeric:"tabular-nums"});
const LBL=({t,sub})=><div style={{fontSize:sub?11:12,color:sub?"#9ca3af":"#6b7280",marginBottom:3}}>{t}</div>;
const Divider=()=><div style={{width:1,background:"#e5e7eb",alignSelf:"stretch",margin:"0 6px"}}/>;

function GuestInput({value,onChange,inherited,label,sub}){
  const ov=value!=="";
  return(
    <div>
      {label&&<LBL t={label} sub={sub}/>}
      <div style={{position:"relative",display:"flex",alignItems:"center"}}>
        <input type="number" min={1} max={MAX_GUESTS} value={value}
          onChange={e=>onChange(e.target.value===""?"":String(clamp(e.target.value,MAX_GUESTS)))}
          placeholder={String(inherited)}
          style={{...iS,paddingRight:ov?28:8,borderColor:ov?"#f59e0b":"#e5e7eb"}}/>
        {ov&&<button onClick={()=>onChange("")} style={{position:"absolute",right:5,background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#f59e0b",padding:0}}>✕</button>}
      </div>
      <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{ov?`Overrides default (${inherited})`:`Inheriting: ${inherited}`}</div>
    </div>
  );
}

export default function App(){
  const[start,setStart]=useState(""),[ end,setEnd]=useState("");
  const[globalGuests,setGlobalGuests]=useState(DEFAULT_GUESTS);
  const[globalDinner,setGlobalDinner]=useState("dinner_3course");
  const[cfgs,setCfgs]=useState({});
  const[tab,setTab]=useState("summary");
  const[sel,setSel]=useState(null);
  const[menus,setMenus]=useState(DEFAULT_MENUS);
  const[nm,setNm]=useState({label:"",base:"",category:"dinner",note:""});
  const[clientName,setClientName]=useState("");
  const[clientEmail,setClientEmail]=useState("");
  const[clientLocation,setClientLocation]=useState("");

  const dates=useMemo(()=>genDates(start,end),[start,end]);
  const days=useMemo(()=>dates.map((d,i)=>cfgs[d]||mkDef(d,i,dates.length)),[dates,cfgs]);
  const calcs=useMemo(()=>days.map(d=>calcDay(d,globalGuests,globalDinner,menus)),[days,globalGuests,globalDinner,menus]);

  const upd=(date,patch)=>setCfgs(p=>{
    const idx=dates.indexOf(date);
    const base=p[date]||(idx>=0?mkDef(date,idx,dates.length):{});
    return{...p,[date]:{...base,...patch}};
  });
  const updMenu=(id,field,val)=>setMenus(ms=>ms.map(m=>m.id===id?{...m,[field]:val}:m));
  const delMenu=id=>setMenus(ms=>ms.filter(m=>m.id!==id));
  const addMenu=()=>{
    if(!nm.label.trim()||!nm.base)return;
    setMenus(ms=>[...ms,{id:uid(),label:nm.label.trim(),base:parseFloat(nm.base),category:nm.category,note:nm.note.trim()||null,deletable:true}]);
    setNm({label:"",base:"",category:"dinner",note:""});
  };
  const resetMenuPrice=id=>setMenus(ms=>ms.map(m=>{const def=DEFAULT_MENUS.find(d=>d.id===id);return m.id===id&&def?{...m,base:def.base}:m;}));

  const totals=useMemo(()=>{
    const svcTotal=calcs.reduce((s,d)=>s+d.svcApplied,0);
    const lunchSvcTotal=calcs.reduce((s,d)=>s+d.lunchSvcFee,0);
    const foodTotal=calcs.reduce((s,d)=>s+d.foodTotal,0);
    const complexityTotal=calcs.reduce((s,d)=>s+d.complexity,0);
    const grand=calcs.reduce((s,d)=>s+d.subtotal,0);
    const retainer=grand*.3,preTotal=grand*.8,finalBal=grand*.2;
    const mealMap={};
    calcs.forEach(dc=>dc.lines.forEach(l=>{
      if(!mealMap[l.key])mealMap[l.key]={label:l.label,days:0,pax:0,base:0,vatCost:0,full:0,isFixed:l.isFixed};
      mealMap[l.key].days++;mealMap[l.key].pax+=l.pax||0;
      mealMap[l.key].base+=l.base;mealMap[l.key].vatCost+=(l.vatCost||0);mealMap[l.key].full+=l.full;
    }));
    let cancel=null;
    if(start){
      const diff=Math.ceil((new Date(start+"T12:00:00")-new Date())/86400000);
      if(diff>14)cancel={c:"#16a34a",l:"More than 14 days away",t:"Rescheduling possible at no charge if ingredients have not yet been purchased. Cancellation: retainer non-refundable, other payments refunded in full if more than 30 days out."};
      else if(diff>=0)cancel={c:"#dc2626",l:"Within 14 days",t:"Per Icelandic union rules, staff shifts cancelled with less than 2 weeks notice must be paid in full. All payments non-refundable."};
      else cancel={c:"#9ca3af",l:"Event passed",t:"N/A"};
    }
    return{svcTotal,lunchSvcTotal,foodTotal,complexityTotal,grand,retainer,preTotal,finalBal,mealMap,cancel};
  },[calcs,start]);

  const menuById=Object.fromEntries(menus.map(m=>[m.id,m]));
  const dinnerMenus=menus.filter(m=>m.category==="dinner");

  const TabBtn=({id,lbl:l})=>(
    <button onClick={()=>setTab(id)} style={{padding:"9px 16px",border:"none",cursor:"pointer",fontSize:14,fontWeight:tab===id?700:400,color:tab===id?"#111827":"#6b7280",background:"none",borderBottom:tab===id?"2px solid #111827":"2px solid transparent",whiteSpace:"nowrap"}}>{l}</button>
  );
  const HolBadge=({name})=>(
    <span style={{marginLeft:6,padding:"1px 6px",borderRadius:3,fontSize:10,background:"#fef3c7",color:"#92400e",fontWeight:700}}>{name} · ×1.9</span>
  );

  const exportQuote=()=>{
    if(!dates.length)return;
    const dayRows=days.map((day,i)=>{
      const c=calcs[i];
      const meals=[];
      if(day.breakfast)meals.push(`Breakfast ×${c.bfastG}`);
      if(c.effDinnerId&&c.effDinnerId!=="none")meals.push(`${menuById[c.effDinnerId]?.label||c.effDinnerId} ×${c.dinnerG}${c.froekenOnly?" (flat rate, no svc fee)":""}`);
      if(day.lunchType==="onsite")meals.push(`On-Site Lunch ×${c.lunchG}`);
      if(day.lunchType==="box")meals.push(`Takeaway Box ×${c.lunchG}`);
      if(day.staffDinner)meals.push(`Staff Dinner ×${day.staffCount} (flat)`);
      if(day.drinksEnabled)meals.push(`Drinks – ${DRINKS_OPTIONS[day.drinksType]?.label} ×${c.drinksG}`);
      return`<tr>
        <td>${fmtDate(day.date)}${c.hol?` <span class="hol">${c.hol} ×1.9</span>`:""}</td>
        <td>${day.type==="full"?"Full Day":"Partial Day"}</td>
        <td>${meals.join("<br>")||"—"}${day.complexityNote?`<br><em style="color:#666;font-size:11px">⚠ ${day.complexityNote}</em>`:""}</td>
        <td class="num">${c.svcApplied>0?ISK(c.svcApplied):"—"}${c.minApplied?'<br><small>min. applied</small>':""}${c.froekenOnly?'<br><small>no svc fee</small>':""}</td>
        <td class="num">${c.foodTotal>0?ISK(c.foodTotal):"—"}</td>
        <td class="num">${c.complexity>0?ISK(c.complexity):"—"}</td>
        <td class="num bold">${ISK(c.subtotal)}</td>
      </tr>`;
    }).join("");

    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Quote ${quoteRef}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;color:#111;padding:40px;font-size:13px;line-height:1.6}h1{font-size:22px;font-weight:bold;margin-bottom:2px}h2{font-size:14px;font-weight:bold;margin:28px 0 8px;padding-bottom:4px;border-bottom:2px solid #111}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #111}.header-right{text-align:right}.header-right .total{font-size:26px;font-weight:bold}table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:12px}th{text-align:left;padding:6px 8px;background:#f5f5f5;border-bottom:2px solid #ccc;font-size:11px;text-transform:uppercase;letter-spacing:.4px}td{padding:6px 8px;border-bottom:1px solid #eee;vertical-align:top}.num{text-align:right}.bold{font-weight:bold}.hol{background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:3px;font-size:10px}small,em{color:#888;font-size:10px}.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;font-size:12px}.disclaimer{background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:12px;margin-top:24px;font-size:11px;color:#92400e;line-height:1.7}.footer{margin-top:32px;padding-top:16px;border-top:1px solid #ccc;font-size:11px;color:#888;text-align:center}tfoot td{font-weight:bold;background:#f5f5f5;border-top:2px solid #ccc}@media print{body{padding:20px}}</style></head><body>
    <div class="header">
      <div><h1>Private Chef Services</h1><p style="color:#666;font-size:12px">Booking Quote · <strong>${quoteRef}</strong></p><p style="margin-top:6px;font-size:12px"><strong>Event dates:</strong> ${fmtDate(start)}${end&&end!==start?" – "+fmtDate(end):""} · ${dates.length} day${dates.length!==1?"s":""}</p><p style="font-size:11px;color:#888;margin-top:4px">Generated: ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</p></div>
      <div class="header-right"><p style="font-size:11px;color:#666">Estimated Total</p><div class="total">${ISK(totals.grand)}</div><p style="margin-top:6px;font-size:12px">Retainer (30%): <strong>${ISK(totals.retainer)}</strong></p><p style="font-size:12px">Due 14 days prior (80%): <strong>${ISK(totals.preTotal)}</strong></p></div>
    </div>
    ${clientName||clientEmail||clientLocation?`<div style="background:#f9f9f9;border:1px solid #ddd;border-radius:6px;padding:12px;margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;font-size:12px">${clientName?`<div><strong>Client</strong><br>${clientName}</div>`:""}${clientEmail?`<div><strong>Email</strong><br>${clientEmail}</div>`:""}${clientLocation?`<div><strong>Location</strong><br>${clientLocation}</div>`:""}</div>`:""}
    <h2>Day-by-Day Summary</h2>
    <table><thead><tr><th>Date</th><th>Type</th><th>Meals</th><th class="num">Service Fee</th><th class="num">Food & Bev</th><th class="num">Complexity</th><th class="num">Day Total</th></tr></thead><tbody>${dayRows}</tbody>
    <tfoot><tr><td colspan="3">TOTAL</td><td class="num">${ISK(totals.svcTotal)}</td><td class="num">${ISK(totals.foodTotal)}</td><td class="num">${totals.complexityTotal>0?ISK(totals.complexityTotal):"—"}</td><td class="num">${ISK(totals.grand)}</td></tr></tfoot></table>
    <h2>Payment Schedule</h2>
    ${[["Estimated Total",totals.grand,true],["30% Retainer (non-refundable, due on booking)",totals.retainer,false],["Total due 14 days before event (80%)",totals.preTotal,true],["Final balance (invoiced within 7 days post-event)",totals.finalBal,false]].map(([l,v,b])=>`<div class="row${b?" bold":""}"><span>${l}</span><span>${ISK(v)}</span></div>`).join("")}
    <div class="disclaimer"><strong>⚠ Important – Estimates Only:</strong> All food and beverage costs are estimates. The <strong>final invoice is always based on the actual cost of goods purchased</strong> + 11% VAT + 30% service markup.</div>
    <div class="footer">Private Chef Services · Selfoss, Iceland · All prices include 11% VAT · Quote ref: ${quoteRef}</div>
    <script>window.onload=()=>window.print()</script></body></html>`;

    const blob=new Blob([html],{type:"text/html"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=`chef-quote-${quoteRef}.html`;
    document.body.appendChild(a);a.click();
    document.body.removeChild(a);URL.revokeObjectURL(url);
  };

  return(
    <div style={{fontFamily:"system-ui,sans-serif",maxWidth:980,margin:"0 auto",padding:"20px 16px",color:"#111827"}}>
      <div style={{marginBottom:16}}>
        <h1 style={{margin:0,fontSize:20,fontWeight:800}}>Private Chef Booking Calculator</h1>
        <p style={{margin:"2px 0 0",color:"#6b7280",fontSize:13}}>Selfoss · All prices incl. 11% VAT · Quote <strong>{quoteRef}</strong></p>
      </div>

      <div style={{background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:10,padding:"14px 16px",marginBottom:20}}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end",marginBottom:14}}>
          <div><LBL t="Event Start Date"/><input type="date" value={start} onChange={e=>{setStart(e.target.value);if(!sel)setSel(e.target.value);}} style={{...iS,width:160}}/></div>
          <div><LBL t="Event End Date"/><input type="date" value={end} min={start} onChange={e=>setEnd(e.target.value)} style={{...iS,width:160}}/></div>
          <Divider/>
          <div>
            <LBL t="Default Guests"/>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <button onClick={()=>setGlobalGuests(g=>Math.max(1,g-1))} style={{width:30,height:30,border:"1px solid #d1d5db",borderRadius:6,background:"#fff",cursor:"pointer",fontSize:16,fontWeight:700}}>−</button>
              <div style={{textAlign:"center",minWidth:32}}>
                <div style={{fontSize:20,fontWeight:800,lineHeight:1}}>{globalGuests}</div>
                <div style={{fontSize:10,color:"#9ca3af"}}>guests</div>
              </div>
              <button onClick={()=>setGlobalGuests(g=>Math.min(MAX_GUESTS,g+1))} style={{width:30,height:30,border:"1px solid #d1d5db",borderRadius:6,background:"#fff",cursor:"pointer",fontSize:16,fontWeight:700}}>+</button>
            </div>
            <div style={{fontSize:10,color:"#9ca3af",marginTop:3}}>max {MAX_GUESTS}</div>
          </div>
          <Divider/>
          <div style={{minWidth:220}}>
            <LBL t="Default Dinner Menu"/>
            <select value={globalDinner} onChange={e=>setGlobalDinner(e.target.value)} style={iS}>
              <option value="none">No Dinner</option>
              {dinnerMenus.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <div style={{fontSize:10,color:"#9ca3af",marginTop:3}}>Override per day</div>
          </div>
          {dates.length>0&&<div style={{marginLeft:"auto",alignSelf:"center",textAlign:"right"}}>
            <div style={{fontWeight:700,fontSize:16}}>{dates.length} day{dates.length!==1?"s":""}</div>
          </div>}
        </div>
        <div style={{borderTop:"1px solid #e5e7eb",paddingTop:12,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          <div><LBL t="Client Name"/><input value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="e.g. Jón Sigurðsson" style={iS}/></div>
          <div><LBL t="Client Email"/><input type="email" value={clientEmail} onChange={e=>setClientEmail(e.target.value)} placeholder="client@example.com" style={iS}/></div>
          <div><LBL t="Event Location"/><input value={clientLocation} onChange={e=>setClientLocation(e.target.value)} placeholder="e.g. Deplar Farm, Skagafjörður" style={iS}/></div>
        </div>
      </div>

      {dates.length===0&&(
        <div style={{background:"#f9fafb",border:"1px dashed #d1d5db",borderRadius:10,padding:40,textAlign:"center",color:"#9ca3af",fontSize:14}}>
          Select a start and end date above to begin.
        </div>
      )}

      {dates.length>0&&<>
        <div style={{background:"#111827",color:"#fff",borderRadius:10,padding:"14px 20px",marginBottom:20,display:"flex",gap:20,flexWrap:"wrap",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1}}>Estimated Total</div>
            <div style={{fontSize:22,fontWeight:800}}>{ISK(totals.grand)}</div>
          </div>
          {[["Retainer (30%)",totals.retainer],["Due 14 days prior (80%)",totals.preTotal],["Final balance",totals.finalBal]].map(([l,v])=>(
            <div key={l} style={{borderLeft:"1px solid #374151",paddingLeft:18}}>
              <div style={{fontSize:11,color:"#9ca3af",textTransform:"uppercase",letterSpacing:1}}>{l}</div>
              <div style={{fontSize:15,fontWeight:700}}>{ISK(v)}</div>
            </div>
          ))}
          {calcs.some(c=>c.hol)&&<div style={{fontSize:12,color:"#fcd34d"}}>⚠ Includes public holidays (×1.9)</div>}
          <button onClick={exportQuote} style={{marginLeft:"auto",padding:"8px 18px",background:"#fff",color:"#111827",border:"none",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:700}}>
            ↓ Export Quote PDF
          </button>
        </div>

        <div style={{borderBottom:"1px solid #e5e7eb",marginBottom:20,display:"flex",overflowX:"auto"}}>
          {[["summary","Summary"],["days",`Day-by-Day (${dates.length})`],["meals","Meal Overview"],["payment","Payment"],["menus","Menus & Prices"],["policy","Policy"]].map(([id,l])=>(
            <TabBtn key={id} id={id} lbl={l}/>
          ))}
        </div>

        {tab==="summary"&&(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>
                {[["Date",false],["Type",false],["Meals & Guests",false],["Service Fee",true],["Food & Bev (est.)",true],["Complexity",true],["Day Total (est.)",true]].map(([h,r])=>(
                  <th key={h} style={thS(r)}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {days.map((day,i)=>{
                  const c=calcs[i];
                  const parts=[];
                  if(day.breakfast)parts.push(`Bfast ×${c.bfastG}`);
                  if(c.effDinnerId&&c.effDinnerId!=="none")parts.push(`${(menuById[c.effDinnerId]?.label||"").replace("Dinner – ","").replace(" (1-course)","")} ×${c.dinnerG}${c.froekenOnly?" (no svc fee)":""}`);
                  if(day.lunchType!=="none")parts.push(`Lunch ×${c.lunchG}`);
                  if(day.drinksEnabled)parts.push(`Drinks ×${c.drinksG}`);
                  return(
                    <tr key={day.date} style={{cursor:"pointer"}}
                      onClick={()=>{setTab("days");setSel(day.date);}}
                      onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"}
                      onMouseLeave={e=>e.currentTarget.style.background=""}>
                      <td style={tdS(false)}>
                        <span style={{fontWeight:600}}>{fmtDate(day.date)}</span>
                        {c.hol&&<HolBadge name={c.hol}/>}
                      </td>
                      <td style={tdS(false)}>
                        <span style={{padding:"2px 6px",borderRadius:4,fontSize:11,background:day.type==="full"?"#dbeafe":"#fef3c7",color:day.type==="full"?"#1e40af":"#92400e"}}>
                          {day.type==="full"?"Full":"Partial"}
                        </span>
                        {c.froekenOnly&&<div style={{fontSize:10,color:"#7c3aed",marginTop:2}}>No svc fee</div>}
                      </td>
                      <td style={{...tdS(false),fontSize:12,color:"#6b7280"}}>{parts.join(" · ")||"—"}</td>
                      <td style={tdS(true)}>
                        {c.svcApplied>0?ISK(c.svcApplied):"—"}
                        {c.minApplied&&<div style={{fontSize:10,color:"#f59e0b"}}>min. applied</div>}
                        {c.hol&&!c.froekenOnly&&<div style={{fontSize:10,color:"#d97706"}}>×1.9 holiday</div>}
                      </td>
                      <td style={tdS(true)}>{c.foodTotal>0?ISK(c.foodTotal):"—"}</td>
                      <td style={tdS(true)}>{c.complexity>0?ISK(c.complexity):"—"}</td>
                      <td style={tdS(true,true)}>{ISK(c.subtotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{background:"#f9fafb"}}>
                  <td colSpan={3} style={{...tdS(false),fontWeight:700}}>TOTAL</td>
                  <td style={{...tdS(true),fontWeight:700}}>{ISK(totals.svcTotal)}</td>
                  <td style={{...tdS(true),fontWeight:700}}>{ISK(totals.foodTotal)}</td>
                  <td style={{...tdS(true),fontWeight:700}}>{totals.complexityTotal>0?ISK(totals.complexityTotal):"—"}</td>
                  <td style={{...tdS(true),fontWeight:800,fontSize:15}}>{ISK(totals.grand)}</td>
                </tr>
              </tfoot>
            </table>
            <p style={{fontSize:12,color:"#9ca3af",marginTop:8}}>Click any row to configure that day. Food & beverage costs are <strong>estimates</strong> — final bill based on actual cost of goods.</p>
          </div>
        )}

        {tab==="days"&&(
          <div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
              {days.map((day,i)=>{
                const c=calcs[i],act=sel===day.date;
                return(
                  <button key={day.date} onClick={()=>setSel(day.date)} style={{
                    padding:"5px 10px",borderRadius:6,border:"1px solid",fontSize:12,cursor:"pointer",
                    fontWeight:act?700:400,background:act?"#111827":c.hol?"#fffbeb":"#fff",
                    color:act?"#fff":c.hol?"#92400e":"#374151",
                    borderColor:act?"#111827":c.hol?"#fcd34d":"#d1d5db"}}>
                    {fmtDate(day.date).split(",")[0]}{c.hol?" ⚠":""}
                  </button>
                );
              })}
            </div>
            {(()=>{
              if(!sel)return<div style={{color:"#9ca3af",fontSize:13}}>Select a day above.</div>;
              const dayIdx=days.findIndex(d=>d.date===sel);
              if(dayIdx<0)return null;
              const day=days[dayIdx],c=calcs[dayIdx];
              const u=(f,v)=>upd(day.date,{[f]:v});
              const isSingleDay=dates.length===1;
              const warnPartial=isSingleDay&&day.type==="partial";
              return(
                <div style={{border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden"}}>
                  <div style={{background:c.hol?"#fffbeb":"#f9fafb",padding:"12px 16px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div><span style={{fontWeight:700,fontSize:15}}>{fmtDate(day.date)}</span>{c.hol&&<HolBadge name={c.hol}/>}</div>
                    <div style={{fontSize:13}}>Day total (est.): <strong>{ISK(c.subtotal)}</strong></div>
                  </div>
                  {isSingleDay&&warnPartial&&(
                    <div style={{margin:"12px 16px 0",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:6,padding:"10px 12px",fontSize:12,color:"#991b1b"}}>
                      <strong>⛔ Partial day not available for single day bookings.</strong>{" "}
                      <button onClick={()=>u("type","full")} style={{background:"none",border:"none",color:"#991b1b",textDecoration:"underline",cursor:"pointer",fontSize:12,fontWeight:700,padding:0}}>Revert to Full Day</button>
                    </div>
                  )}
                  <div style={{padding:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                    <div style={{display:"flex",flexDirection:"column",gap:12}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        <div>
                          <LBL t="Day Type"/>
                          <select value={day.type} onChange={e=>u("type",e.target.value)} style={iS}>
                            <option value="full">Full Day (98,000 ISK · min. 120,000)</option>
                            <option value="partial">Partial Day – multi-day only (58,800 · min. 72,000)</option>
                          </select>
                        </div>
                        <GuestInput label={`Day Guests (default: ${globalGuests})`} value={day.guestsOverride} onChange={v=>u("guestsOverride",v)} inherited={globalGuests}/>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        <div><LBL t="Extra Staff"/><input type="number" min={0} value={day.extraStaff} onChange={e=>u("extraStaff",parseInt(e.target.value)||0)} style={iS}/></div>
                        <div>
                          <LBL t="Overnight Stay"/>
                          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,marginTop:6}}>
                            <input type="checkbox" checked={day.overnight} onChange={e=>u("overnight",e.target.checked)}/>
                            <span>Required</span>
                          </label>
                          {day.overnight&&<input value={day.overnightNote} onChange={e=>u("overnightNote",e.target.value)} placeholder="e.g. Guest house provided" style={{...iS,marginTop:4,fontSize:12}}/>}
                        </div>
                      </div>

                      <div style={{background:"#f9fafb",borderRadius:8,padding:12}}>
                        <div style={{fontWeight:600,fontSize:13,marginBottom:10}}>Meal Selection</div>

                        {/* Breakfast */}
                        <div style={{marginBottom:12,paddingBottom:12,borderBottom:"1px solid #e5e7eb"}}>
                          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,marginBottom:6}}>
                            <input type="checkbox" checked={day.breakfast} onChange={e=>u("breakfast",e.target.checked)}/>
                            <span style={{fontWeight:600}}>Breakfast</span>
                            <span style={{color:"#9ca3af",fontSize:11}}>est. {ISK(addFull(menuById["breakfast"]?.base||2000))}/pax</span>
                          </label>
                          {day.breakfast&&<div style={{paddingLeft:20,borderLeft:"2px solid #e5e7eb"}}>
                            <GuestInput label="Breakfast guests" value={day.breakfastGuests} onChange={v=>u("breakfastGuests",v)} inherited={c.dayG} sub/>
                          </div>}
                        </div>

                        {/* Dinner */}
                        <div style={{marginBottom:12,paddingBottom:12,borderBottom:"1px solid #e5e7eb"}}>
                          <div style={{fontWeight:600,fontSize:13,marginBottom:6}}>Dinner</div>
                          <div style={{display:"flex",gap:6,marginBottom:4}}>
                            <select value={day.dinnerMenuOverridden?(day.dinnerMenuId||"none"):globalDinner}
                              onChange={e=>upd(day.date,{dinnerMenuId:e.target.value,dinnerMenuOverridden:true})}
                              style={{...iS,borderColor:day.dinnerMenuOverridden?"#f59e0b":"#e5e7eb"}}>
                              <option value="none">No Dinner</option>
                              {dinnerMenus.map(m=><option key={m.id} value={m.id}>{m.label} — est. {ISK(addFull(m.base))}/pax</option>)}
                            </select>
                            {day.dinnerMenuOverridden&&<button onClick={()=>upd(day.date,{dinnerMenuOverridden:false,dinnerMenuId:null})}
                              style={{padding:"4px 8px",border:"1px solid #f59e0b",borderRadius:5,background:"#fff",color:"#f59e0b",cursor:"pointer",fontSize:12}}>✕ Reset</button>}
                          </div>
                          {c.froekenOnly&&<div style={{marginTop:6,background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:6,padding:"8px 10px",fontSize:12,color:"#92400e"}}>🍽 Fröken Selfoss only — no chef service fee applies.</div>}
                          {c.effDinnerId&&c.effDinnerId!=="none"&&<div style={{paddingLeft:20,borderLeft:"2px solid #e5e7eb",marginTop:8}}>
                            <GuestInput label="Dinner guests" value={day.dinnerGuests} onChange={v=>u("dinnerGuests",v)} inherited={c.dayG} sub/>
                          </div>}
                        </div>

                        {/* Lunch */}
                        <div style={{marginBottom:12,paddingBottom:12,borderBottom:"1px solid #e5e7eb"}}>
                          <div style={{fontWeight:600,fontSize:13,marginBottom:6}}>Lunch</div>
                          <select value={day.lunchType} onChange={e=>u("lunchType",e.target.value)} style={{...iS,marginBottom:6}}>
                            <option value="none">No Lunch</option>
                            <option value="onsite">On-Site Lunch — 60,000 ISK + ingredients</option>
                            <option value="box">Takeaway Box — {ISK(BOX_FIXED)}/pax fixed</option>
                            <option value="custom">Custom Budget</option>
                          </select>
                          {day.lunchType!=="none"&&<div style={{paddingLeft:20,borderLeft:"2px solid #e5e7eb",display:"flex",flexDirection:"column",gap:6}}>
                            <GuestInput label="Lunch guests" value={day.lunchGuests} onChange={v=>u("lunchGuests",v)} inherited={c.dayG} sub/>
                            {day.lunchType==="custom"&&<div>
                              <LBL t="Food cost (ISK, excl. VAT & markup)" sub/>
                              <input type="number" min={0} value={day.customLunchBudget} onChange={e=>u("customLunchBudget",e.target.value)} placeholder="e.g. 20000" style={{...iS,width:150}}/>
                            </div>}
                          </div>}
                        </div>

                        {/* Drinks */}
                        <div style={{marginBottom:12,paddingBottom:12,borderBottom:"1px solid #e5e7eb"}}>
                          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,marginBottom:6}}>
                            <input type="checkbox" checked={day.drinksEnabled} onChange={e=>u("drinksEnabled",e.target.checked)}/>
                            <span style={{fontWeight:600}}>Drinks / Beverages</span>
                          </label>
                          {day.drinksEnabled&&<div style={{paddingLeft:20,borderLeft:"2px solid #e5e7eb",display:"flex",flexDirection:"column",gap:8}}>
                            <select value={day.drinksType} onChange={e=>u("drinksType",e.target.value)} style={iS}>
                              {Object.entries(DRINKS_OPTIONS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                            </select>
                            {DRINKS_OPTIONS[day.drinksType]&&<div style={{fontSize:11,color:day.drinksType==="full_bar"?"#dc2626":"#9ca3af"}}>{DRINKS_OPTIONS[day.drinksType].note}</div>}
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                              <div>
                                <LBL t={`Budget/pax (default: ${ISK(DRINKS_OPTIONS[day.drinksType]?.defaultBudget||0)})`} sub/>
                                <input type="number" min={0} value={day.drinksBudgetPerPax} onChange={e=>u("drinksBudgetPerPax",e.target.value)} placeholder={String(DRINKS_OPTIONS[day.drinksType]?.defaultBudget||"")} style={iS}/>
                              </div>
                              <GuestInput label="Drinks guests" value={day.drinksGuests} onChange={v=>u("drinksGuests",v)} inherited={c.dayG} sub/>
                            </div>
                          </div>}
                        </div>

                        {/* Staff dinner */}
                        <div style={{marginBottom:12,paddingBottom:12,borderBottom:"1px solid #e5e7eb"}}>
                          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,marginBottom:6}}>
                            <input type="checkbox" checked={day.staffDinner} onChange={e=>u("staffDinner",e.target.checked)}/>
                            <span style={{fontWeight:600}}>Staff / Host Dinner</span>
                            <span style={{color:"#9ca3af",fontSize:11}}>Flat {ISK(menuById["staff_dinner"]?.base||2900)}/pax</span>
                          </label>
                          {day.staffDinner&&<div style={{paddingLeft:20,borderLeft:"2px solid #e5e7eb"}}>
                            <LBL t="Staff count" sub/>
                            <input type="number" min={1} value={day.staffCount} onChange={e=>u("staffCount",parseInt(e.target.value)||1)} style={{...iS,width:70}}/>
                          </div>}
                        </div>

                        {/* Complexity */}
                        <div>
                          <div style={{fontWeight:600,fontSize:13,marginBottom:6}}>Complexity / Dietary Surcharge</div>
                          <input value={day.complexityNote} onChange={e=>u("complexityNote",e.target.value)} placeholder="e.g. 4 separate dietary menus" style={{...iS,marginBottom:6}}/>
                          <input type="number" min={0} value={day.complexitySurcharge} onChange={e=>u("complexitySurcharge",e.target.value)} placeholder="Surcharge (ISK)" style={{...iS,width:160}}/>
                        </div>
                      </div>
                      <div><LBL t="Notes"/><input value={day.notes} onChange={e=>u("notes",e.target.value)} placeholder="e.g. Arrival evening" style={iS}/></div>
                    </div>

                    {/* Breakdown panel */}
                    <div style={{background:"#f9fafb",borderRadius:8,padding:14}}>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>Day Breakdown</div>
                      <div style={{fontSize:11,color:"#6b7280",textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Service Fee</div>
                      {c.froekenOnly?(
                        <div style={{fontSize:13,color:"#7c3aed",padding:"4px 0"}}>— No service fee (Fröken only)</div>
                      ):[
                        {l:c.froekenWithBfast?"Chef fee (breakfast, partial rate)":"Chef fee",v:c.chefFee,note:c.hol?"×1.9 holiday":null},
                        ...(c.staffFee>0?[{l:`Extra staff (${day.extraStaff}×)`,v:c.staffFee}]:[]),
                        ...(c.minApplied?[{l:"Min. spend top-up",v:c.minShortfall,note:`below min. ${ISK(c.min)}`,warn:true}]:[]),
                      ].map((r,i)=>(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #e5e7eb",fontSize:13}}>
                          <span>{r.l}{r.note&&<span style={{color:r.warn?"#f59e0b":"#9ca3af",fontSize:11,marginLeft:4}}>{r.note}</span>}</span>
                          <span>{ISK(r.v)}</span>
                        </div>
                      ))}
                      <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontWeight:700,fontSize:13}}>
                        <span>Service total</span><span>{c.svcApplied>0?ISK(c.svcApplied):"—"}</span>
                      </div>
                      {c.lines.length>0&&<>
                        <div style={{fontSize:11,color:"#6b7280",textTransform:"uppercase",letterSpacing:.5,margin:"12px 0 6px"}}>Food & Beverage <span style={{color:"#f59e0b",fontSize:10,textTransform:"none"}}>estimates</span></div>
                        {c.lines.map((l,i)=>(
                          <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #e5e7eb",fontSize:12}}>
                            <span>{l.label} ×{l.pax}{l.isFixed&&<span style={{color:"#9ca3af",fontSize:10}}> (flat)</span>}</span>
                            <span style={{fontWeight:600}}>{ISK(l.full)}</span>
                          </div>
                        ))}
                        {c.lunchSvcFee>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12,color:"#6b7280"}}>
                          <span>Lunch service fee</span><span>{ISK(c.lunchSvcFee)}</span>
                        </div>}
                        <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0 0",fontWeight:700,fontSize:13,borderTop:"1px solid #d1d5db",marginTop:4}}>
                          <span>Food total (est.)</span><span>{ISK(c.foodTotal+c.lunchSvcFee)}</span>
                        </div>
                      </>}
                      {c.complexity>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:13,borderTop:"1px solid #e5e7eb",marginTop:4,color:"#d97706"}}>
                        <span>Complexity surcharge</span><span>{ISK(c.complexity)}</span>
                      </div>}
                      <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0 0",fontWeight:800,fontSize:15,borderTop:"2px solid #d1d5db",marginTop:8}}>
                        <span>Day Total (est.)</span><span>{ISK(c.subtotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {tab==="meals"&&(
          <div>
            <h3 style={{margin:"0 0 16px",fontSize:15,fontWeight:700}}>Meal Overview – All Days</h3>
            {Object.keys(totals.mealMap).length===0?(
              <p style={{color:"#9ca3af",fontSize:13}}>No meals configured yet.</p>
            ):(
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  {[["Meal",false],["Days",true],["Total Pax",true],["Base",true],["incl. VAT",true],["Final",true]].map(([h,r])=>(
                    <th key={h} style={thS(r)}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {Object.entries(totals.mealMap).map(([key,m])=>(
                    <tr key={key}>
                      <td style={tdS(false)}>{m.label}{m.isFixed&&<span style={{color:"#9ca3af",fontSize:11}}> (flat)</span>}</td>
                      <td style={tdS(true)}>{m.days}×</td>
                      <td style={tdS(true)}>{m.pax}</td>
                      <td style={tdS(true)}>{m.isFixed?"—":ISK(m.base)}</td>
                      <td style={{...tdS(true),color:"#9ca3af"}}>{m.isFixed?"—":ISK(m.vatCost)}</td>
                      <td style={{...tdS(true),fontWeight:700}}>{ISK(m.full)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{background:"#f9fafb"}}>
                    <td colSpan={3} style={{...tdS(false),fontWeight:700}}>TOTAL (est.)</td>
                    <td style={{...tdS(true),fontWeight:700}}>{ISK(Object.values(totals.mealMap).filter(m=>!m.isFixed).reduce((s,m)=>s+m.base,0))}</td>
                    <td style={{...tdS(true),color:"#9ca3af",fontWeight:700}}>{ISK(Object.values(totals.mealMap).filter(m=>!m.isFixed).reduce((s,m)=>s+m.vatCost,0))}</td>
                    <td style={{...tdS(true),fontWeight:800,fontSize:14}}>{ISK(totals.foodTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}

        {tab==="payment"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
            <div>
              <div style={{fontWeight:700,marginBottom:12}}>Payment Schedule</div>
              {[["Estimated grand total",totals.grand,true],["30% Retainer (non-refundable, due on booking)",totals.retainer,false],["Additional pre-payment (due 14 days before)",totals.preTotal-totals.retainer,false],["Total due 14 days before event (80%)",totals.preTotal,true],["Final balance – invoiced within 7 days post-event",totals.finalBal,false]].map(([l,v,b])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #f3f4f6",fontWeight:b?700:400}}>
                  <span style={{fontSize:13}}>{l}</span><span style={{fontSize:13}}>{ISK(v)}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{fontWeight:700,marginBottom:12}}>Cancellation Policy</div>
              {totals.cancel?(
                <div style={{background:"#f9fafb",borderRadius:8,padding:14,borderLeft:`4px solid ${totals.cancel.c}`}}>
                  <div style={{fontWeight:700,color:totals.cancel.c,marginBottom:6}}>{totals.cancel.l}</div>
                  <div style={{fontSize:13}}>{totals.cancel.t}</div>
                </div>
              ):(
                <div style={{background:"#f9fafb",borderRadius:8,padding:14,color:"#9ca3af",fontSize:13}}>Set a start date to see the applicable policy.</div>
              )}
            </div>
          </div>
        )}

        {tab==="menus"&&(
          <div>
            <div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:8,padding:"12px 16px",marginBottom:20,fontSize:13,color:"#92400e"}}>
              ⚠️ <strong>Estimates only.</strong> Final invoice always based on actual cost of goods + 11% VAT + 30% markup.
            </div>
            {Object.entries(CAT_LABELS).map(([cat,catLabel])=>{
              const catMenus=menus.filter(m=>m.category===cat);
              if(!catMenus.length)return null;
              return(
                <div key={cat} style={{marginBottom:28}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:10,borderBottom:"2px solid #e5e7eb",paddingBottom:6}}>{catLabel}</div>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr>
                      {[["Menu Item",false],["Base / pax",true],["incl. VAT",true],["Final (VAT+30%)",true],["",false]].map(([h,r])=>(
                        <th key={h} style={thS(r)}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {catMenus.map(m=>{
                        const defBase=DEFAULT_MENUS.find(d=>d.id===m.id)?.base;
                        const changed=defBase!==undefined&&m.base!==defBase;
                        const isFlat=[FROEKEN_ID,"staff_dinner","lunch_box"].includes(m.id);
                        return(
                          <tr key={m.id}>
                            <td style={tdS(false)}>
                              <div style={{fontWeight:500}}>{m.label}</div>
                              {m.note&&<div style={{fontSize:11,color:"#9ca3af"}}>{m.note}</div>}
                            </td>
                            <td style={{...tdS(true),width:220}}>
                              <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:6}}>
                                {changed&&<button onClick={()=>resetMenuPrice(m.id)} style={{fontSize:10,padding:"1px 6px",border:"1px solid #d1d5db",borderRadius:4,background:"#fff",cursor:"pointer",color:"#6b7280"}}>reset</button>}
                                <div style={{display:"flex",alignItems:"center",border:"1px solid #d1d5db",borderRadius:5,overflow:"hidden",background:"#fff"}}>
                                  <input type="number" min={0} value={m.base} onChange={e=>updMenu(m.id,"base",parseFloat(e.target.value)||0)}
                                    style={{border:"none",outline:"none",padding:"4px 6px",width:80,fontSize:13,textAlign:"right"}}/>
                                  <span style={{padding:"0 6px",background:"#f9fafb",borderLeft:"1px solid #e5e7eb",fontSize:11,color:"#6b7280"}}>ISK</span>
                                </div>
                              </div>
                              {changed&&<div style={{fontSize:10,color:"#f59e0b",textAlign:"right",marginTop:2}}>default: {ISK(defBase)}</div>}
                            </td>
                            <td style={{...tdS(true),color:"#6b7280"}}>{isFlat?"Flat":ISK(addVat(m.base))}</td>
                            <td style={{...tdS(true),fontWeight:700}}>{isFlat?ISK(m.base)+" (flat)":ISK(addFull(m.base))}</td>
                            <td style={{textAlign:"right",padding:"8px 10px"}}>
                              <div style={{display:"flex",gap:6,justifyContent:"flex-end",alignItems:"center"}}>
                                <input value={m.label} onChange={e=>updMenu(m.id,"label",e.target.value)} style={{...iS,width:190,fontSize:12,padding:"3px 6px"}}/>
                                {m.deletable&&<button onClick={()=>delMenu(m.id)} style={{padding:"3px 8px",border:"1px solid #fca5a5",borderRadius:4,background:"#fff",color:"#dc2626",cursor:"pointer",fontSize:12}}>Remove</button>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
            <div style={{border:"1px dashed #d1d5db",borderRadius:10,padding:16,background:"#fafafa"}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>Add Custom Menu Item</div>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 2fr auto",gap:10,alignItems:"flex-end"}}>
                <div><LBL t="Name"/><input value={nm.label} onChange={e=>setNm(p=>({...p,label:e.target.value}))} placeholder="e.g. Tasting menu" style={iS}/></div>
                <div><LBL t="Category"/><select value={nm.category} onChange={e=>setNm(p=>({...p,category:e.target.value}))} style={iS}>{Object.entries(CAT_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
                <div><LBL t="Base / pax (ISK)"/><input type="number" min={0} value={nm.base} onChange={e=>setNm(p=>({...p,base:e.target.value}))} placeholder="e.g. 5000" style={iS}/></div>
                <div><LBL t="Note"/><input value={nm.note} onChange={e=>setNm(p=>({...p,note:e.target.value}))} placeholder="optional" style={iS}/></div>
                <button onClick={addMenu} disabled={!nm.label.trim()||!nm.base}
                  style={{padding:"7px 18px",background:"#111827",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:14,fontWeight:600,opacity:(!nm.label.trim()||!nm.base)?0.4:1}}>
                  + Add
                </button>
              </div>
            </div>
          </div>
        )}

        {tab==="policy"&&(
          <div style={{maxWidth:700,fontSize:14,lineHeight:1.8,color:"#374151"}}>
            {[
              {n:"1. Service Fee Structure",c:<><p><strong>Daily Service Fee:</strong> 98,000 ISK per day (incl. 11% VAT). Includes menu planning, sourcing, preparation, cooking, service, and travel within 30 min of Selfoss.</p><p><strong>Public Holidays:</strong> 1.9× the daily rate. Applies to Christmas (24–25 Dec), New Year (31 Dec – 1 Jan), National Day (17 Jun), Frídagur verslunarmanna, Good Friday, Easter Sunday, Pentecost.</p><p><strong>Additional Staff:</strong> 60% of daily fee per person. Required for full bar service.</p><p style={{fontSize:12,color:"#6b7280",borderLeft:"3px solid #e5e7eb",paddingLeft:10,marginTop:8}}><em>* Staff/Host Dinner: Lodge management only — flat 2,900 ISK/pax, no markup or holiday surcharge.</em></p></>},
              {n:"2. Multi-Day Bookings",c:<p>Partial days (arrival/departure) billed at 60% of daily fee. Single-day bookings always billed at full rate.</p>},
              {n:"3. Food & Beverage Pricing",c:<p>Ingredient cost (incl. VAT) + 30% service markup. Final costs calculated after the event based on actual purchases.</p>},
              {n:"4. Minimum Spend",c:<><p>Applies to total day spend (service + food).</p><ul style={{margin:"4px 0 8px",paddingLeft:20}}><li>Full day: <strong>120,000 ISK</strong></li><li>Partial day: <strong>72,000 ISK</strong></li><li>Fröken Selfoss only: no minimum</li></ul></>},
              {n:"5. Fröken Selfoss – Partner Restaurant",c:<><p>15% group discount on current set menu pricing. See <a href="https://www.frokenselfoss.is" target="_blank" style={{color:"#2563eb"}}>frokenselfoss.is</a> for current prices. Direct pass-through — does not count toward service fee minimums.</p><ul style={{margin:"4px 0",paddingLeft:20}}><li>Fröken only: no service fee, no minimum</li><li>Breakfast + Fröken: partial-day service fee for breakfast only</li></ul></>},
              {n:"6. Travel & Overnight",c:<p>Travel within 30 min of Selfoss included. Overnight required if breakfast before 08:30 and location is 30+ min away. Accommodation invoiced at cost.</p>},
              {n:"7. Optional Add-Ons",c:<><p><strong>On-Site Lunch:</strong> 60,000 ISK + ingredients.</p><p><strong>Takeaway Lunch Box:</strong> 3,800 ISK fixed. Includes main, juice, energy bar and sweet treat, fruit, water.</p><p><strong>Drinks:</strong> Ingredient cost + 30% markup. Welcome cocktail and wine pairing served by chef. Full bar requires dedicated bartender.</p></>},
              {n:"8. Menu Complexity",c:<p>Standard pricing assumes minimal dietary complexity. Multiple separate menus or strict allergy protocols may incur a surcharge, agreed in advance. Final guest count and dietary requirements due 7 days before event.</p>},
              {n:"9. Booking & Payment Terms",c:<><p><strong>Retainer:</strong> 30% non-refundable, due on booking.</p><p><strong>Pre-event:</strong> 80% due 14 days before event.</p><p><strong>Final:</strong> Balance invoiced within 7 days post-event, due 7 days from invoice.</p></>},
              {n:"10. Cancellation & Rescheduling",c:(
                <table style={{borderCollapse:"collapse",width:"100%",fontSize:13}}>
                  <thead><tr style={{background:"#f9fafb"}}>{["Timing","Cancellation","Rescheduling"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",borderBottom:"1px solid #e5e7eb",fontWeight:600}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {[
                      ["30+ days","Retainer non-refundable. All other payments refunded.","Free if ingredients not purchased."],
                      ["14–30 days","Retainer non-refundable. 50% of prepayment refundable if ingredients not purchased.","Free if ingredients not purchased."],
                      ["Within 14 days","All payments non-refundable. Staff must be paid per union rules.","Case-by-case. Staff must be compensated."],
                    ].map(([t,c,r])=>(
                      <tr key={t}><td style={{padding:"8px 10px",borderBottom:"1px solid #f3f4f6",fontWeight:500}}>{t}</td><td style={{padding:"8px 10px",borderBottom:"1px solid #f3f4f6"}}>{c}</td><td style={{padding:"8px 10px",borderBottom:"1px solid #f3f4f6"}}>{r}</td></tr>
                    ))}
                  </tbody>
                </table>
              )},
              {n:"11. Force Majeure",c:<><p>We will make every effort to arrange replacements in case of chef illness. Severe weather, road closures, or supply chain disruptions will be handled collaboratively — rescheduling at no charge where possible. No service fee charged for days on which service is not delivered.</p></>},
              {n:"12. Event Logistics",c:<p>Functional oven and stove required — please disclose if unavailable. Luxury lodges with professional kitchens are our standard environment.</p>},
            ].map(({n,c})=>(
              <div key={n} style={{marginBottom:24}}>
                <h3 style={{margin:"0 0 8px",fontSize:15,fontWeight:700,color:"#111827"}}>{n}</h3>
                {c}
              </div>
            ))}
          </div>
        )}
      </>}
    </div>
  );
}
