const container=document.getElementById('canvas-container');
const layersPanel=document.getElementById('layers-panel');
const galleryPanel=document.getElementById('gallery-panel');
const brushTypeSelect=document.getElementById('brush-type');
const brushSizeSelect=document.getElementById('brush-size');
const colorPicker=document.getElementById('color');
const undoBtn=document.getElementById('undo');
const redoBtn=document.getElementById('redo');
const fillBtn=document.getElementById('fill');
const saveBtn=document.getElementById('save');
const addLayerBtn=document.getElementById('add-layer');
const imageInput=document.getElementById('image-input');
const canvasWidthInput=document.getElementById('canvas-width');
const canvasHeightInput=document.getElementById('canvas-height');
const resizeCanvasBtn=document.getElementById('resize-canvas');

let layers=[];
let activeLayer=null;
let isFilling=false;
let scaleFactor=1;

// 브러시 타입
const brushTypes=['원형','사각','점선','그라데이션'];
brushTypes.forEach(type=>{
  const opt=document.createElement('option');
  opt.value=type; opt.text=type;
  brushTypeSelect.appendChild(opt);
});

// 브러시 크기
for(let i=1;i<=20;i++){
  const opt=document.createElement('option');
  opt.value=i; opt.text=i;
  brushSizeSelect.appendChild(opt);
}
brushSizeSelect.value=5;

// 레이어 생성
function createLayer(name='Layer'){
  const canvas=document.createElement('canvas');
  const w=parseInt(canvasWidthInput.value);
  const h=parseInt(canvasHeightInput.value);
  canvas.width=w; canvas.height=h;
  canvas.style.width=w+'px'; canvas.style.height=h+'px';
  container.style.width=w+'px'; container.style.height=h+'px';
  container.appendChild(canvas);
  const ctx=canvas.getContext('2d');
  const layer={canvas,ctx,name,brightness:1,visible:true,history:[],redoStack:[]};
  layers.push(layer);
  activeLayer=layer;
  updateLayersPanel();
  attachDrawingEvents(canvas,layer);
  drawLayers();
  return layer;
}

// 레이어 패널
function updateLayersPanel(){
  layersPanel.innerHTML='';
  layers.forEach(layer=>{
    const div=document.createElement('div');
    div.className='layer-item';
    div.innerHTML=`<span>${layer.name}</span>
      <input type="range" min="0" max="2" step="0.01" value="${layer.brightness}">
      <button>${layer.visible?'👁':'🚫'}</button>`;
    const range=div.querySelector('input');
    const btn=div.querySelector('button');
    range.addEventListener('input',()=>{ layer.brightness=parseFloat(range.value); drawLayers(); });
    btn.addEventListener('click',()=>{ layer.visible=!layer.visible; btn.textContent=layer.visible?'👁':'🚫'; drawLayers(); });
    div.addEventListener('click',()=>{ activeLayer=layer; });
    layersPanel.appendChild(div);
  });
}

// 레이어 표시
function drawLayers(){
  layers.forEach(layer=>{
    layer.canvas.style.display=layer.visible?'block':'none';
    layer.canvas.style.filter=`brightness(${layer.brightness})`;
    layer.canvas.style.transform=`scale(${scaleFactor})`;
    layer.canvas.style.transformOrigin='0 0';
  });
}

// 드로잉 이벤트
function attachDrawingEvents(canvas,layer){
  let drawing=false,lastX=0,lastY=0;
  function start(e){
    e.preventDefault();
    const pos=getPos(e);
    lastX=pos.x; lastY=pos.y;
    drawing=true;
    if(isFilling){ fillCanvas(layer.ctx,colorPicker.value); saveHistory(layer); isFilling=false; }
  }
  function move(e){
    if(!drawing) return;
    const pos=getPos(e);
    const ctx=layer.ctx;
    ctx.strokeStyle=colorPicker.value; ctx.lineWidth=brushSizeSelect.value; ctx.lineCap='round';
    ctx.beginPath();
    if(brushTypeSelect.value==='점선') ctx.setLineDash([5,5]);
    else ctx.setLineDash([]);
    if(brushTypeSelect.value==='사각'){ ctx.fillStyle=colorPicker.value; ctx.fillRect(pos.x,pos.y,ctx.lineWidth,ctx.lineWidth); }
    else if(brushTypeSelect.value==='그라데이션'){
      const grad=ctx.createLinearGradient(lastX,lastY,pos.x,pos.y);
      grad.addColorStop(0,colorPicker.value); grad.addColorStop(1,'white');
      ctx.strokeStyle=grad; ctx.moveTo(lastX,lastY); ctx.lineTo(pos.x,pos.y); ctx.stroke();
    }
    else{ ctx.moveTo(lastX,lastY); ctx.lineTo(pos.x,pos.y); ctx.stroke(); }
    lastX=pos.x; lastY=pos.y;
  }
  function end(){ if(drawing) saveHistory(layer); drawing=false; }

  canvas.addEventListener('mousedown',start);
  canvas.addEventListener('touchstart',start);
  canvas.addEventListener('mousemove',move);
  canvas.addEventListener('touchmove',move);
  canvas.addEventListener('mouseup',end);
  canvas.addEventListener('touchend',end);
}

// 좌표
function getPos(e){
  const rect=container.getBoundingClientRect();
  if(e.touches) e=e.touches[0];
  return {x:e.clientX-rect.left, y:e.clientY-rect.top};
}

// 페인트통
function fillCanvas(ctx,color){ ctx.fillStyle=color; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }

// 히스토리
function saveHistory(layer){
  const img=layer.ctx.getImageData(0,0,layer.canvas.width,layer.canvas.height);
  layer.history.push(img); layer.redoStack=[];
}

// undo/redo
undoBtn.addEventListener('click',()=>{
  const layer=activeLayer; if(!layer || layer.history.length===0) return;
  const last=layer.history.pop();
  const current=layer.ctx.getImageData(0,0,layer.canvas.width,layer.canvas.height);
  layer.redoStack.push(current);
  layer.ctx.putImageData(last,0,0);
});
redoBtn.addEventListener('click',()=>{
  const layer=activeLayer; if(!layer || layer.redoStack.length===0) return;
  const next=layer.redoStack.pop();
  const current=layer.ctx.getImageData(0,0,layer.canvas.width,layer.canvas.height);
  layer.history.push(current);
  layer.ctx.putImageData(next,0,0);
});

// 저장 + 갤러리
saveBtn.addEventListener('click',()=>{
  const link=document.createElement('a'); link.download='drawing.png';
  const tmpCanvas=document.createElement('canvas');
  tmpCanvas.width=parseInt(canvasWidthInput.value); tmpCanvas.height=parseInt(canvasHeightInput.value);
  const tmpCtx=tmpCanvas.getContext('2d');
  layers.forEach(layer=>{ if(layer.visible) tmpCtx.drawImage(layer.canvas,0,0); });
  link.href=tmpCanvas.toDataURL(); link.click(); addGallery(tmpCanvas.toDataURL());
});
function addGallery(src){ const img=document.createElement('img'); img.src=src; img.className='gallery-item';
  img.addEventListener('click',()=>{ loadGalleryImage(src); }); galleryPanel.appendChild(img); }
function loadGalleryImage(src){ const img=new Image(); img.onload=()=>{ activeLayer.ctx.drawImage(img,0,0); saveHistory(activeLayer); }; img.src=src; }

// 레이어 추가
addLayerBtn.addEventListener('click',()=>{ createLayer('Layer '+(layers.length+1)); });

// 캔버스 크기 조절
resizeCanvasBtn.addEventListener('click',()=>{
  const w=parseInt(canvasWidthInput.value), h=parseInt(canvasHeightInput.value);
  container.style.width=w+'px'; container.style.height=h+'px';
  layers.forEach(layer=>{
    const tmp=document.createElement('canvas'); tmp.width=w; tmp.height=h;
    tmp.getContext('2d').drawImage(layer.canvas,0,0);
    layer.canvas.width=w; layer.canvas.height=h;
    layer.canvas.style.width=w+'px'; layer.canvas.style.height=h+'px';
    layer.ctx.drawImage(tmp,0,0);
  });
});

// 줌: 마우스 Ctrl+휠 / 터치 핀치
let lastZoomDist=0;
container.addEventListener('wheel', e=>{
  if(e.ctrlKey){ e.preventDefault(); scaleFactor+=e.deltaY*-0.001; if(scaleFactor<0.1) scaleFactor=0.1; if(scaleFactor>5) scaleFactor=5; drawLayers(); }
});
container.addEventListener('touchmove', e=>{
  if(e.touches.length===2){
    e.preventDefault();
    const dist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
    if(lastZoomDist) scaleFactor*=dist/lastZoomDist;
    if(scaleFactor<0.1) scaleFactor=0.1; if(scaleFactor>5) scaleFactor=5;
    lastZoomDist=dist; drawLayers();
  }
});
container.addEventListener('touchend', e=>{ if(e.touches.length<2) lastZoomDist=0; });

// 이미지 삽입: 독립 레이어 생성 후 합성
imageInput.addEventListener('change', (e)=>{
  const file=e.target.files[0]; if(!file) return;
  const img=new Image(); img.src=URL.createObjectURL(file);
  img.onload=()=>{
    const tempLayer=createLayer('이미지 삽입'); // 임시 레이어
    tempLayer.canvas.style.zIndex=999;
    let x=(tempLayer.canvas.width-img.width)/2;
    let y=(tempLayer.canvas.height-img.height)/2;
    let scale=1, dragging=false, startX, startY;

    function draw(){
      tempLayer.ctx.clearRect(0,0,tempLayer.canvas.width,tempLayer.canvas.height);
      tempLayer.ctx.save();
      tempLayer.ctx.translate(x+img.width/2,y+img.height/2);
      tempLayer.ctx.scale(scale,scale);
      tempLayer.ctx.drawImage(img,-img.width/2,-img.height/2);
      tempLayer.ctx.restore();
    }
    draw();

    function start(ev){ ev.preventDefault(); dragging=true; const pos=getPos(ev); startX=pos.x-x; startY=pos.y-y; }
    function move(ev){ if(!dragging) return; const pos=getPos(ev); x=pos.x-startX; y=pos.y-startY; draw(); }
    function end(ev){ dragging=false; }

    tempLayer.canvas.addEventListener('mousedown',start);
    tempLayer.canvas.addEventListener('mousemove',move);
    tempLayer.canvas.addEventListener('mouseup',end);
    tempLayer.canvas.addEventListener('touchstart',start);
    tempLayer.canvas.addEventListener('touchmove',move);
    tempLayer.canvas.addEventListener('touchend',end);

    const confirmBtn=document.createElement('button'); confirmBtn.textContent='확정';
    confirmBtn.style.position='absolute'; confirmBtn.style.top='10px'; confirmBtn.style.left='50px'; confirmBtn.style.zIndex=1000;
    container.appendChild(confirmBtn);
    const cancelBtn=document.createElement('button'); cancelBtn.textContent='취소';
    cancelBtn.style.position='absolute'; cancelBtn.style.top='10px'; cancelBtn.style.left='120px'; cancelBtn.style.zIndex=1000;
    container.appendChild(cancelBtn);

    confirmBtn.onclick=()=>{
      saveHistory(tempLayer);
      tempLayer.canvas.style.zIndex=''; // 일반 레이어로 합성
      container.removeChild(confirmBtn); container.removeChild(cancelBtn);
    };
    cancelBtn.onclick=()=>{
      container.removeChild(tempLayer.canvas);
      layers=layers.filter(l=>l!==tempLayer);
      updateLayersPanel();
      container.removeChild(confirmBtn); container.removeChild(cancelBtn);
    };
  };
});

// 초기 레이어
createLayer('Layer 1');
