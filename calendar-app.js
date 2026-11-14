(() => {
  'use strict';
  const data=window.CANISVERSE_CALENDAR, events=data.events;
  const $=s=>document.getElementById(s), types={show:'Výstava',trial:'Pracovní zkouška',breeding:'Bonitace'}, countries={CZ:'Česko',AT:'Rakousko',SK:'Slovensko',PL:'Polsko',DE:'Německo',IE:'Irsko',CH:'Švýcarsko',NL:'Nizozemsko',HR:'Chorvatsko',PT:'Portugalsko',BA:'Bosna a Hercegovina',BE:'Belgie',ES:'Španělsko',SI:'Slovinsko',FR:'Francie'};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const day=s=>new Date(s+'T12:00:00Z');
  const fmt=s=>day(s).toLocaleDateString('cs-CZ',{timeZone:'UTC'});
  const monthKey=d=>d.slice(0,7);
  const shiftMonth=(s,n)=>{const d=day(s+'-01');d.setUTCMonth(d.getUTCMonth()+n);return d.toISOString().slice(0,7)};
  const filter=(items,f)=>items.filter(e=>(!f.type||e.type===f.type)&&(!f.country||e.country===f.country)&&(!f.breed||e.breed===f.breed)&&(!f.year||e.start.slice(0,4)===f.year)&&norm([e.title,e.city,e.judge,e.notes].join(' ')).includes(norm(f.query||'')));
  const nextDay=s=>{const d=day(s);d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10).replaceAll('-','')};
  const icsEscape=s=>String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
  const fold=line=>{let out='',part='',len=0;for(const c of line){const n=new TextEncoder().encode(c).length;if(len+n>75){out+=part+'\r\n';part=' ';len=1}part+=c;len+=n}return out+part};
  function ics(items){return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CANISVERSE//Calendar//CS','CALSCALE:GREGORIAN',...items.flatMap(e=>['BEGIN:VEVENT','UID:'+e.id+'@canisverse.com','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),'DTSTART;VALUE=DATE:'+e.start.replaceAll('-',''),'DTEND;VALUE=DATE:'+nextDay(e.end),'SUMMARY:'+icsEscape(e.title),'LOCATION:'+icsEscape(e.city+', '+(countries[e.country]||e.country)),'DESCRIPTION:'+icsEscape((e.status==='announced'?'Oznámený termín; propozice ověřit. ':'')+(e.notes||'')+'\nPropozice: '+(e.propositions||e.source)+(e.documents?.length?'\nPDF propozice: '+e.documents.map(d=>d.url).join(' '):'')+'\nZdroj: '+e.source+'\nKontrola: '+e.checked),'URL:'+e.source,'END:VEVENT']),'END:VCALENDAR'].map(fold).join('\r\n')+'\r\n'}
  // Pure helpers are also used by the local verification script.
  if(typeof module!=='undefined')module.exports={filter,shiftMonth,ics,nextDay,norm};
  if(typeof document==='undefined')return;
  let mode='list', current=monthKey(events.slice().sort((a,b)=>a.start.localeCompare(b.start))[0].start),returnFocus=null;
  function options(id,vals,label=x=>x){for(const v of [...new Set(vals)].sort()){const o=document.createElement('option');o.value=v;o.textContent=label(v);$(id).append(o)}}
  options('country',events.map(e=>e.country),x=>countries[x]||x); options('breed',events.map(e=>e.breed));options('year',events.map(e=>e.start.slice(0,4)));
  $('stats').innerHTML=Object.entries(types).map(([key,name])=>`<span><b>${events.filter(e=>e.type===key).length}</b> ${key==='show'?'výstav':key==='trial'?'pracovní zkouška':'bonitací'}</span>`).join('');
  $('coverage').textContent=data.coverage;
  $('pending').innerHTML='<h2>K ověření</h2>'+data.pending.map(p=>`<h3>${esc(p.title)}</h3><p>${esc(p.note)}</p><p>${p.sources.map((u,i)=>`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">Zdroj ${i+1} ↗</a>`).join(' · ')}</p>`).join('');
  const values=()=>Object.fromEntries(['query','type','country','breed','year'].map(k=>[k,$(k).value]));
  const selected=()=>filter(events,values()).sort((a,b)=>a.start.localeCompare(b.start)||a.type.localeCompare(b.type));
  const visible=()=>selected().filter(e=>mode!=='month'||(e.start<=current+'-31'&&e.end>=current+'-01'));
  function render(){
    const all=selected(),items=visible();$('list').setAttribute('aria-pressed',mode==='list');$('month').setAttribute('aria-pressed',mode==='month');$('monthnav').hidden=mode!=='month';
    $('monthtitle').textContent=day(current+'-01').toLocaleDateString('cs-CZ',{month:'long',year:'numeric',timeZone:'UTC'});
    $('count').textContent=`Zobrazeno ${items.length} z ${events.length} akcí${mode==='month'?' • export zahrnuje tento měsíc':''}.`;
    $('export').disabled=!items.length;
    if(mode==='list'){
      $('results').innerHTML=items.length?'<div class="rows">'+items.map(e=>`<article class="row"><time datetime="${e.start}">${fmt(e.start)}</time><div><span class="pill ${e.type}">${types[e.type]}</span>${e.status==='announced'?'<span class="pill warn">Oznámeno</span>':''}<h3>${esc(e.title)}</h3><p class="meta">${esc(e.city)} · ${esc(countries[e.country]||e.country)} · ${esc(e.breed)}</p><p class="meta">${e.deadline?'Uzávěrka '+fmt(e.deadline):'Uzávěrka neuvedena'} · Kontrola ${fmt(e.checked)}</p></div><div><button data-id="${esc(e.id)}">Detail akce →</button>${e.propositions?`<br><a href="${esc(e.propositions)}" target="_blank" rel="noopener noreferrer">Propozice / informace ↗</a>`:''}</div></article>`).join('')+'</div>':'<p class="empty">Pro tento výběr zatím nemáme žádnou akci. Zkuste zrušit filtry.</p>';
    }else{
      const first=day(current+'-01'),offset=(first.getUTCDay()+6)%7,days=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
      let html=['Po','Út','St','Čt','Pá','So','Ne'].map(d=>`<div class="weekday">${d}</div>`).join('');
      for(let n=0;n<Math.ceil((offset+days)/7)*7;n++){
        const d=n-offset+1;if(d<1||d>days){html+='<div class="day blank" aria-hidden="true"></div>';continue}
        const date=current+'-'+String(d).padStart(2,'0'); html+=`<div class="day"><span>${d}.</span>`+items.filter(e=>e.start<=date&&e.end>=date).map(e=>`<button data-id="${esc(e.id)}" aria-label="${esc(fmt(date)+' '+e.title+' '+e.city)}">${esc(e.city)}<br>${types[e.type]}</button>`).join('')+'</div>';
      }
      $('results').innerHTML=(!items.length?'<p class="empty">V tomto měsíci pro zvolené filtry nemáme žádné akce.</p>':'')+'<div class="calendar-scroll"><div class="grid">'+html+'</div></div>';
    }
  }
  function detail(id){const e=events.find(x=>x.id===id);if(!e)return;returnFocus=document.activeElement;
    const rows=[['Datum',fmt(e.start)+(e.end!==e.start?' – '+fmt(e.end):'')],['Místo',e.city+' · '+(countries[e.country]||e.country)],['Plemeno',e.breed],...(e.venue?[['Areál',e.venue]]:[]),...(e.registrationStatus?[['Přihlašování',e.registrationStatus]]:[]),['Stav',e.status==='announced'?'Oznámený termín':e.status==='listed'?'Termín ze seznamu; obsah propozic neověřen':'Termín zveřejněný pořadatelem'],['Uzávěrka',e.deadline?fmt(e.deadline):'Pořadatel zatím neuvedl / nezjištěna'],['Rozhodčí / komise',e.judge||'Zatím neuvedeni'],['Kontrola',fmt(e.checked)]];
    $('detailcontent').innerHTML=`<span class="pill ${e.type}">${types[e.type]}</span><h2 id="detailtitle">${esc(e.title)}</h2><dl>${rows.map(([a,b])=>`<dt>${a}</dt><dd>${esc(b)}</dd>`).join('')}</dl>${e.notes?'<p>'+esc(e.notes)+'</p>':''}<p><a href="${esc(e.source)}" target="_blank" rel="noopener noreferrer">Informace pořadatele / původní zdroj ↗</a></p>${e.propositions?`<p><a href="${esc(e.propositions)}" target="_blank" rel="noopener noreferrer">Propozice a informace k výstavě ↗</a></p>`:''}${(e.documents||[]).map(d=>`<p><a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">PDF propozice: ${esc(d.label)} ↗</a></p>`).join('')}<p class="meta">Podmínky účasti a případné změny ověřte v aktuálních propozicích.</p>`;$('detail').showModal();
  }
  $('results').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)detail(b.dataset.id)});
  $('close').onclick=()=>$('detail').close();$('detail').addEventListener('close',()=>returnFocus?.focus());
  $('filters').onsubmit=e=>e.preventDefault();$('filters').addEventListener('input',()=>{const s=selected();if(mode==='month'&&s.length&&!s.some(e=>monthKey(e.start)===current))current=monthKey(s[0].start);render()});
  $('list').onclick=()=>{mode='list';render()};$('month').onclick=()=>{mode='month';const s=selected();if(s.length)current=monthKey(s[0].start);render()};
  $('previous').onclick=()=>{current=shiftMonth(current,-1);$('year').value='';render()};$('next').onclick=()=>{current=shiftMonth(current,1);$('year').value='';render()};
  $('reset').onclick=()=>{$('filters').reset();render()};
  $('export').onclick=()=>{const url=URL.createObjectURL(new Blob([ics(visible())],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='canisverse-akce.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};
  render();
})();
