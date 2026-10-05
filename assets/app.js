(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  menuButton?.addEventListener('click', () => {
    const open = nav.classList.toggle('mobile-open');
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
  });
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('mobile-open'); menuButton?.setAttribute('aria-expanded', 'false');
  }));

  const questionSets = {
    light: {name:'سؤال خفيف',questions:['وش ودك نسوي سوا نهاية الأسبوع؟','وش أكلة تحب نتعلم نسويها مع بعض؟','لو عندنا ساعة فاضية اليوم، كيف نقضيها؟','وش شي صغير فرّحك هالأسبوع؟']},
    memories: {name:'من الذكريات',questions:['وش طلعة عائلية للحين تذكرها؟','وش لعبة كنت تحبها وأنت صغير؟','مين علمك شي للحين تستخدمه؟','وش صورة قديمة تحب نشوفها سوا؟']},
    imagine: {name:'تخيلوا',questions:['لو فتحنا مقهى عائلي ليوم واحد، وش بنقدم؟','لو نقدر نزور أي مكان في عطلة قصيرة، وين نروح؟','لو اخترنا اسمًا لفريقنا العائلي، وش بيكون؟','وش مهارة ودك نتعلمها مع بعض؟']}
  };
  let selectedSet = 'light', questionIndex = 0;
  const question = document.getElementById('question');
  const category = document.getElementById('question-category');
  const questionNumber = document.getElementById('question-number');
  function showQuestion(){
    if(!question)return;
    const set=questionSets[selectedSet]; question.textContent=set.questions[questionIndex];
    if(category)category.textContent=set.name;
    if(questionNumber)questionNumber.textContent=String(questionIndex+1).padStart(2,'0');
  }
  document.querySelectorAll('[data-set]').forEach(button=>button.addEventListener('click',()=>{
    selectedSet=button.dataset.set in questionSets?button.dataset.set:'light';questionIndex=0;
    document.querySelectorAll('[data-set]').forEach(item=>item.classList.toggle('active',item===button));showQuestion();
  }));
  document.getElementById('next')?.addEventListener('click',()=>{
    questionIndex=(questionIndex+1)%questionSets[selectedSet].questions.length;showQuestion();
  });

  const timer = document.getElementById('timer');
  if(timer){
    let seconds=900, interval=null, ended=false;
    const status=document.getElementById('timer-status'), start=document.getElementById('start');
    function renderTimer(){timer.textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
    document.querySelectorAll('[data-min]').forEach(button=>button.addEventListener('click',()=>{
      if(interval)return;
      document.querySelectorAll('[data-min]').forEach(item=>item.classList.toggle('selected',item===button));
      seconds=Number(button.dataset.min)*60;ended=false;if(status)status.textContent='جاهزين';if(start)start.innerHTML='ابدؤوا المؤقت <span>▶</span>';renderTimer();
    }));
    start?.addEventListener('click',()=>{
      if(ended)return;
      if(interval){clearInterval(interval);interval=null;if(status)status.textContent='متوقف مؤقتًا';start.innerHTML='استكملوا المؤقت <span>▶</span>';return;}
      if(status)status.textContent='الجلسة جارية';start.innerHTML='إيقاف مؤقت <span>Ⅱ</span>';
      interval=setInterval(()=>{seconds=Math.max(0,seconds-1);renderTimer();if(seconds===0){clearInterval(interval);interval=null;ended=true;if(status)status.textContent='انتهى الوقت';start.textContent='انتهى الوقت';}},1000);
    });
    document.getElementById('reset-timer')?.addEventListener('click',()=>{
      if(interval){clearInterval(interval);interval=null;}
      const active=document.querySelector('[data-min].selected');seconds=Number(active?.dataset.min||15)*60;ended=false;
      if(status)status.textContent='جاهزين';if(start)start.innerHTML='ابدؤوا المؤقت <span>▶</span>';renderTimer();
    });
    renderTimer();
  }

  mountAssistant();

  function mountAssistant(){
    const toggle=document.createElement('button');toggle.className='ai-launcher';toggle.type='button';toggle.setAttribute('aria-label','افتحوا مساعد جلسة');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','jalsa-ai-panel');toggle.innerHTML='<span aria-hidden="true">ج</span>';
    const panel=document.createElement('aside');panel.className='ai-panel';panel.id='jalsa-ai-panel';panel.setAttribute('aria-label','محادثة مساعد جلسة');panel.setAttribute('aria-hidden','true');
    panel.innerHTML='<div class="ai-panel-head"><span class="ai-panel-icon">ج</span><div class="ai-panel-title"><b>مساعد جلسة</b><small>للفكرة، السؤال، أو ترتيب وقتكم</small></div><button class="ai-clear" type="button">محادثة جديدة</button><button class="ai-close" type="button" aria-label="إغلاق المساعد">×</button></div><div class="ai-messages" aria-live="polite"></div><div class="ai-suggestions"><button type="button" data-ask="رتب لنا ربع ساعة بعد العشاء">ربع ساعة بعد العشاء</button><button type="button" data-ask="اقترح نشاطًا يشارك فيه الصغار والكبار">نشاط للجميع</button></div><form class="ai-composer"><label class="visually-hidden" for="jalsa-ai-input">اكتبوا طلبكم لمساعد جلسة</label><textarea id="jalsa-ai-input" rows="1" maxlength="1200" placeholder="اسألوا أو اكتبوا فكرتكم…" required></textarea><button class="ai-send" type="submit" aria-label="إرسال">↑</button></form><p class="ai-privacy">تُستخدم رسالتك لإعداد الرد عبر مزود الخدمة. لا تكتب معلومات خاصة.</p>';
    document.body.append(toggle,panel);
    const messageList=panel.querySelector('.ai-messages'), form=panel.querySelector('form'), input=panel.querySelector('textarea'), send=panel.querySelector('.ai-send');
    let history=[],busy=false;
    function addMessage(role,text,typing=false){
      const item=document.createElement('div');item.className=`ai-message${role==='user'?' user':''}${typing?' ai-typing':''}`;
      const who=document.createElement('small');who.textContent=role==='user'?'أنتم':'مساعد جلسة';
      const body=document.createElement('p');body.textContent=text;item.append(who,body);messageList.append(item);messageList.scrollTop=messageList.scrollHeight;return item;
    }
    function welcome(){addMessage('assistant','أهلًا! اسألوني عن أي شيء، أو قولوا لي وش ودكم تسوون سوا.');}
    function setOpen(open){panel.classList.toggle('open',open);panel.setAttribute('aria-hidden',String(!open));toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'إغلاق مساعد جلسة':'افتحوا مساعد جلسة');if(open)input.focus();}
    async function ask(raw){
      const prompt=raw.trim();if(!prompt||busy)return;
      input.value='';input.style.height='auto';addMessage('user',prompt);history.push({role:'user',content:prompt});
      busy=true;input.disabled=true;send.disabled=true;const pending=addMessage('assistant','لحظة وأجهز لكم الرد…',true);
      try{
        const response=await fetch('./api/guide',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history.slice(-8)})});
        const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'ما قدرنا نجهز اقتراحًا الآن.');
        pending.remove();history.push({role:'assistant',content:data.answer});addMessage('assistant',data.answer);
      }catch(error){
        pending.remove();const message=error instanceof TypeError?'لتشغيل المساعد، افتحوا الموقع عبر Vercel مع إضافة OPENAI_API_KEY إلى متغيرات البيئة.':error.message;addMessage('assistant',message);
      }finally{busy=false;input.disabled=false;send.disabled=false;input.focus();}
    }
    toggle.addEventListener('click',()=>setOpen(!panel.classList.contains('open')));
    panel.querySelector('.ai-close').addEventListener('click',()=>setOpen(false));
    panel.querySelector('.ai-clear').addEventListener('click',()=>{if(busy)return;history=[];messageList.replaceChildren();welcome();input.value='';});
    panel.querySelectorAll('[data-ask]').forEach(button=>button.addEventListener('click',()=>ask(button.dataset.ask)));
    form.addEventListener('submit',event=>{event.preventDefault();ask(input.value);});
    input.addEventListener('input',()=>{input.style.height='auto';input.style.height=`${Math.min(input.scrollHeight,90)}px`;});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&panel.classList.contains('open'))setOpen(false);});
    welcome();
  }
})();
