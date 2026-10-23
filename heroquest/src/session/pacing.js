(function () {
  "use strict";
  // One cancellable presentation step. Timers never resolve dice or rules.
  window.HeroQuest.createTurnPacing=function({blocked}) {
    let step=null,timer=0,paused=false;
    function stop(){clearTimeout(timer);timer=0;}
    function arm() {
      stop();if(!step||paused||document.hidden)return;
      const waiting=blocked();
      step.started=performance.now();
      timer=setTimeout(()=>{
        timer=0;if(!step||paused||document.hidden)return;
        if(waiting||blocked()){arm();return;}
        const run=step.run;step=null;run();
      },waiting?200:step.remaining);
    }
    function suspend(){if(timer&&step&&!blocked())step.remaining=Math.max(0,step.remaining-(performance.now()-step.started));stop();}
    function schedule(key,run,delay=1000) {
      if(step?.key===key)return;
      stop();step={key,run,remaining:delay,started:0};arm();
    }
    function clear(){stop();step=null;}
    function setPaused(value){suspend();paused=Boolean(value);arm();}
    document.addEventListener("visibilitychange",()=>{if(document.hidden)suspend();else arm();});
    window.addEventListener("pagehide",clear);
    return Object.freeze({schedule,clear,setPaused,get paused(){return paused;}});
  };
})();
