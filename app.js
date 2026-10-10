(function(){
  var $ = function(id){return document.getElementById(id)};
  var KEY = function(u){return 'nfb:v1:'+u};
  var followers=null, following=null;
  var S = {user:'', followers:[], following:[], prev:null, date:null, hidden:{}, tab:'non', showHidden:false};

  /* ---------- storage ---------- */
  function load(u){ try{ var r=localStorage.getItem(KEY(u)); return r?JSON.parse(r):null; }catch(e){ return null; } }
  function save(u,obj){ try{ localStorage.setItem(KEY(u), JSON.stringify(obj)); return true; }catch(e){ return false; } }
  function wipe(u){ try{ localStorage.removeItem(KEY(u)); }catch(e){} }
  function cleanUser(){ return $('user').value.trim().replace(/^@/,'').toLowerCase(); }
  function fmt(d){ try{ return new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}); }catch(e){ return ''; } }

  function refreshSaved(){
    var u = cleanUser(), box=$('savedBox');
    var data = u ? load(u) : null;
    if(data && data.snaps && data.snaps.length){
      var last = data.snaps[data.snaps.length-1];
      $('savedTitle').textContent = 'Saved results for @'+u;
      $('savedSub').textContent = 'Last check '+fmt(last.d)+' · '+data.snaps.length+' saved check'+(data.snaps.length>1?'s':'');
      box.classList.remove('hidden');
    } else box.classList.add('hidden');
  }
  $('user').addEventListener('input', refreshSaved);
  $('clearSaved').addEventListener('click', function(){
    var u=cleanUser(); if(!u) return;
    if(confirm('Delete all saved data for @'+u+'?')){ wipe(u); refreshSaved(); toast('Saved data deleted'); }
  });
  $('openSaved').addEventListener('click', function(){
    var u=cleanUser(), data=load(u); if(!data||!data.snaps.length) return;
    var last=data.snaps[data.snaps.length-1], prev=data.snaps.length>1?data.snaps[data.snaps.length-2]:null;
    start(u,{followers:last.followers,following:last.following,d:last.d},prev,data.hidden||{});
  });

  /* ---------- parsing ---------- */
  function bindDrop(inputId,labelId,nameId,setter){
    $(inputId).addEventListener('change',function(e){
      var files=Array.prototype.slice.call(e.target.files); if(!files.length) return;
      $(nameId).textContent=files.map(function(f){return f.name}).join(', ');
      $(labelId).classList.add('ok');
      Promise.all(files.map(readFile)).then(function(lists){
        var m=[]; lists.forEach(function(l){m=m.concat(l)});
        setter(dedupe(m)); $('err').classList.add('hidden'); check();
      }).catch(function(){
        setter(null); $(labelId).classList.remove('ok');
        showErr("We couldn't read that file. Choose the followers or following file from your Instagram download.");
        check();
      });
    });
  }
  function check(){ $('go').disabled=!(followers&&followers.length&&following&&following.length); }
  function showErr(m){ var e=$('err'); e.textContent=m; e.classList.remove('hidden'); }
  function readFile(file){
    return new Promise(function(res,rej){
      var r=new FileReader(); r.onerror=rej;
      r.onload=function(){
        try{
          var t=String(r.result);
          var out=/\.json$/i.test(file.name)?fromJSON(JSON.parse(t)):fromHTML(t);
          if(!out.length) throw new Error('empty'); res(out);
        }catch(err){ rej(err); }
      };
      r.readAsText(file);
    });
  }
  function fromJSON(data){
    var items=Array.isArray(data)?data:null;
    if(!items){ var k=Object.keys(data).filter(function(k){return Array.isArray(data[k])})[0]; items=k?data[k]:[]; }
    var out=[];
    items.forEach(function(it){
      var sl=it&&it.string_list_data&&it.string_list_data[0];
      var n=(sl&&sl.value)||(it&&it.title)||'';
      if(n) out.push({n:n.trim().toLowerCase(), t:(sl&&sl.timestamp)||0});
    });
    return out;
  }
  function fromHTML(text){
    var doc=new DOMParser().parseFromString(text,'text/html'), out=[];
    doc.querySelectorAll('a[href*="instagram.com"]').forEach(function(a){
      var n=(a.textContent||'').trim();
      if(!n){ var p=a.getAttribute('href').split('/').filter(Boolean); n=p[p.length-1]; }
      if(n) out.push({n:n.replace(/^@/,'').toLowerCase(), t:0});
    });
    return out;
  }
  function dedupe(a){ var s={}; return a.filter(function(x){ if(s[x.n]) return false; s[x.n]=1; return true; }); }
  bindDrop('fFollowers','dropFollowers','fnFollowers',function(v){followers=v});
  bindDrop('fFollowing','dropFollowing','fnFollowing',function(v){following=v});

  /* ---------- analyze ---------- */
  $('go').addEventListener('click',function(){
    var u=cleanUser()||'you';
    var data=load(u)||{snaps:[],hidden:{}};
    var prev=data.snaps.length?data.snaps[data.snaps.length-1]:null;
    var now={d:new Date().toISOString(), followers:followers, following:following};
    data.snaps.push(now); if(data.snaps.length>12) data.snaps=data.snaps.slice(-12);
    var ok=save(u,data);
    start(u,now,prev,data.hidden||{});
    if(!ok) toast('Results could not be saved in this browser');
  });

  function names(a){ return a.map(function(x){return x.n}); }
  function setOf(a){ var s={}; names(a).forEach(function(n){s[n]=1}); return s; }

  function start(u,snap,prev,hidden){
    S.user=u; S.date=snap.d; S.hidden=hidden; S.prev=prev; S.followers=snap.followers; S.following=snap.following;
    var fset=setOf(S.followers), gset=setOf(S.following);
    var pf=prev?setOf(prev.followers):null;
    S.lists={
      non:S.following.filter(function(x){return !fset[x.n]}),
      fans:S.followers.filter(function(x){return !gset[x.n]}),
      lost:prev?prev.followers.filter(function(x){return !fset[x.n]}):[],
      'new':prev?S.followers.filter(function(x){return !pf[x.n]}):[]
    };
    $('sFollowing').textContent=S.following.length.toLocaleString();
    $('sFollowers').textContent=S.followers.length.toLocaleString();
    $('sNon').textContent=S.lists.non.length.toLocaleString();
    $('meName').textContent=u;
    $('meDate').textContent='Checked '+fmt(snap.d)+(prev?' · compared with '+fmt(prev.d):'');
    var av=$('meAv'); av.style.background=colorFor(u); av.textContent=initial(u);
    $('cNon').textContent=S.lists.non.length;
    $('cFans').textContent=S.lists.fans.length;
    $('cLost').textContent=prev?S.lists.lost.length:'';
    $('cNew').textContent=prev?S.lists['new'].length:'';
    S.tab='non'; S.showHidden=false; $('q').value='';
    setTabs();
    $('setup').classList.add('hidden'); $('results').classList.remove('hidden'); $('backBtn').classList.remove('hidden');
    render(); window.scrollTo(0,0);
  }
  $('backBtn').addEventListener('click',function(){
    $('results').classList.add('hidden'); $('setup').classList.remove('hidden'); $('backBtn').classList.add('hidden'); refreshSaved();
  });

  /* ---------- render ---------- */
  var palette=['#e1306c','#833ab4','#fd1d1d','#f56040','#405de6','#5851db','#c13584','#e8912d','#0095f6','#00a676'];
  function colorFor(n){ var h=0; for(var i=0;i<n.length;i++) h=(h*31+n.charCodeAt(i))>>>0; return palette[h%palette.length]; }
  function initial(n){ return (n.replace(/[^a-z0-9]/gi,'')[0]||'?').toUpperCase(); }
  function setTabs(){ document.querySelectorAll('#tabs button').forEach(function(b){ b.classList.toggle('on',b.dataset.tab===S.tab); }); }
  document.querySelectorAll('#tabs button').forEach(function(b){
    b.addEventListener('click',function(){ S.tab=b.dataset.tab; S.showHidden=false; setTabs(); render(); });
  });
  $('q').addEventListener('input',render);
  $('sort').addEventListener('change',render);
  $('toggleHidden').addEventListener('click',function(){ S.showHidden=!S.showHidden; render(); });

  var SUB={non:'Not following you back',fans:'Follows you, you don\u2019t follow back',lost:'Unfollowed you since last check','new':'Started following you'};
  var EMPTY={non:'Everyone you follow follows you back.',fans:'You follow back everyone who follows you.',lost:'Nobody unfollowed you since the last check.','new':'No new followers since the last check.'};

  function current(){
    var q=$('q').value.trim().toLowerCase().replace(/^@/,'');
    var list=S.lists[S.tab].slice();
    var hiddenCount=0;
    if(S.tab==='non'){
      hiddenCount=list.filter(function(x){return S.hidden[x.n]}).length;
      list=list.filter(function(x){return S.showHidden?S.hidden[x.n]:!S.hidden[x.n]});
    }
    if(q) list=list.filter(function(x){return x.n.indexOf(q)>-1});
    var s=$('sort').value;
    list.sort(function(a,b){
      if(s==='recent') return (b.t||0)-(a.t||0) || (a.n<b.n?-1:1);
      if(s==='za') return a.n<b.n?1:-1;
      return a.n<b.n?-1:1;
    });
    return {list:list,hiddenCount:hiddenCount,q:q};
  }

  function render(){
    var c=current(), box=$('list'); box.innerHTML='';
    var noPrev=(S.tab==='lost'||S.tab==='new')&&!S.prev;
    var th=$('toggleHidden');
    if(S.tab==='non'&&(c.hiddenCount||S.showHidden)){ th.classList.remove('hidden'); th.textContent=S.showHidden?'Back to list':'Hidden ('+c.hiddenCount+')'; }
    else th.classList.add('hidden');
    $('count').textContent=noPrev?'':c.list.length.toLocaleString()+(S.showHidden?' hidden accounts':' accounts');
    $('copyBtn').classList.toggle('hidden',!c.list.length);
    if(noPrev){ box.appendChild(emptyEl('This is your first saved check. Upload a newer Instagram export later and this tab shows who unfollowed you and who followed you.')); return; }
    if(!c.list.length){ box.appendChild(emptyEl(c.q?'No accounts match your search.':(S.showHidden?'No hidden accounts.':EMPTY[S.tab]))); return; }
    var frag=document.createDocumentFragment();
    c.list.forEach(function(x){ frag.appendChild(rowEl(x)); });
    box.appendChild(frag);
  }
  function emptyEl(t){ var d=document.createElement('div'); d.className='empty'; d.textContent=t; return d; }

  function rowEl(x){
    var row=document.createElement('div'); row.className='row';
    var a=document.createElement('a'); a.className='main';
    a.href='https://www.instagram.com/'+encodeURIComponent(x.n)+'/'; a.target='_blank'; a.rel='noopener noreferrer';
    var ring=document.createElement('div'); ring.className='storyring';
    var av=document.createElement('div'); av.className='avatar sm'; av.style.background=colorFor(x.n); av.textContent=initial(x.n); ring.appendChild(av);
    var who=document.createElement('div'); who.className='who';
    var b=document.createElement('b'); b.textContent=x.n;
    var s=document.createElement('small'); s.textContent=SUB[S.tab]; who.appendChild(b); who.appendChild(s);
    a.appendChild(ring); a.appendChild(who); row.appendChild(a);
    var btn;
    if(S.tab==='non'){
      btn=document.createElement('button'); btn.className='chip'; btn.textContent=S.hidden[x.n]?'Restore':'Hide';
      btn.addEventListener('click',function(){ toggleHide(x.n); });
    } else {
      btn=document.createElement('a'); btn.className='chip'; btn.textContent='View';
      btn.href=a.href; btn.target='_blank'; btn.rel='noopener noreferrer';
    }
    row.appendChild(btn); return row;
  }
  function toggleHide(n){
    if(S.hidden[n]) delete S.hidden[n]; else S.hidden[n]=1;
    var data=load(S.user)||{snaps:[],hidden:{}}; data.hidden=S.hidden; save(S.user,data);
    render();
  }

  /* ---------- copy ---------- */
  $('copyBtn').addEventListener('click',function(){
    var text=current().list.map(function(x){return x.n}).join('\n');
    function fallback(){
      try{
        var ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
        document.body.appendChild(ta); ta.select(); var ok=document.execCommand('copy'); document.body.removeChild(ta);
        toast(ok?'List copied':'Copy not available here');
      }catch(e){ toast('Copy not available here'); }
    }
    try{ navigator.clipboard.writeText(text).then(function(){toast('List copied')},fallback); }catch(e){ fallback(); }
  });

  var tt;
  function toast(m){ var t=$('toast'); t.textContent=m; t.classList.remove('hidden'); clearTimeout(tt); tt=setTimeout(function(){t.classList.add('hidden')},2200); }
})();
