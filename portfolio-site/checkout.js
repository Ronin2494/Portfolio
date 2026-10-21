(() => {
  'use strict';
  const API='https://badbunny-membership-api.onrender.com';
  const params=new URLSearchParams(location.search);
  const status=document.getElementById('status');
  const headline=document.getElementById('title');
  const message=document.getElementById('message');
  const icon=document.getElementById('symbol');
  const disclaimer=document.getElementById('disclaimer');
  const set=(title,desc,detail,kind)=>{
    headline.textContent=title;message.textContent=desc;status.textContent=detail;
    status.dataset.kind=kind||'';
    icon.textContent=kind==='success'?'✓':kind==='error'?'!':'✦';
  };
  async function run(){
    if(params.has('cancel')){
      set('Checkout cancelled','Your payment was not completed.','No charge was confirmed. You can return to the gallery.','error');
      return;
    }
    const orderId=params.get('token');
    if(!orderId||!/^[A-Z0-9]{10,32}$/.test(orderId)){
      set('No payment to verify','Start your purchase from a gallery item.','PayPal order reference is missing.','error');
      return;
    }
    // Remove order token from the browser's history after capturing the value.
    history.replaceState(null,'',location.pathname);
    try{
      const resp=await fetch(API+'/api/paypal/orders/'+encodeURIComponent(orderId)+'/capture',{
        method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},
        body:'{}',signal:AbortSignal.timeout(30000)
      });
      const data=await resp.json();
      if(!resp.ok)throw new Error(data.error||'Payment could not be verified.');
      if(data.status!=='COMPLETED')throw new Error('PayPal has not confirmed the payment.');
      if(data.mode==='sandbox'){
        set('Sandbox test successful','PayPal confirmed your simulated purchase.',
          'TEST PURCHASE · '+(data.title||'Media')+' · CA$'+data.amount+' · No actual charge or unlock','success');
        disclaimer.textContent='Sandbox transactions do not grant access to paid media. Live fulfillment requires separate activation.';
      }else{
        set('Payment confirmed','Your payment has been verified by PayPal.',
          'PAID · '+(data.title||'Media')+' · CA$'+data.amount,'success');
        disclaimer.textContent='To view purchased media, sign in using the email address registered with PayPal. Access is granted only to verified matching buyers.';
      }
    }catch(error){
      set('Verification pending','We cannot confirm this order right now.',
        error.message+' If you were charged, contact the seller before trying to pay again.','error');
    }
  }
  void run();
})();