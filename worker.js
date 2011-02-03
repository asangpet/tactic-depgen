onmessage = function(e) {
   var k = 0, limit = e.data.time*1;
   //console.log("time:"+e.data.time);
   for (i=0;i<limit;i++) {
     k=k+1;
   }   
   postMessage({result:"ok"});
};
