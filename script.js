const container = document.getElementById('canvas-container');
const layersPanel = document.getElementById('layers-panel');
const galleryPanel = document.getElementById('gallery-panel');
const brushTypeSelect = document.getElementById('brush-type');
const brushSizeSelect = document.getElementById('brush-size');
const colorPicker = document.getElementById('color');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');
const fillBtn = document.getElementById('fill');
const saveBtn = document.getElementById('save');
const addLayerBtn = document.getElementById('add-layer');
const imageInput = document.getElementById('image-input');
const canvasWidthInput = document.getElementById('canvas-width');
const canvasHeightInput = document.getElementById('canvas-height');
const resizeCanvasBtn = document.getElementById('resize-canvas');

let layers = [];
let activeLayer = null;
let history = [];
let redoStack = [];
let isFilling = false;
let scaleFactor = 1; // 줌

// 브러시 타입
const brushTypes = ['원형', '사각', '점선', '그라데이션'];
brushTypes.forEach(type=>{
  const opt = document.createElement('option');
  opt.value = type;
  opt.text = type;
  brushTypeSelect.appendChild(opt);
});

// 브러시 크기
for(let i=1;i<=20;i++){
  const opt = document.createElement('option');
  opt.value=i;
  opt.text=i;
  brushSizeSelect.appendChild(opt);
}
brushSizeSelect.value=5;

// 레이어 생성
function createLayer(name='Layer'){
  const canvas = document.createElement('canvas');
  canvas.width = parseInt(canvasWidthInput.value);
  canvas.height = parseInt(canvasHeightInput.value);
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const layer = {canvas, ctx, name, brightness:1, visible:true};
  layers.push(layer);
  activeLayer = layer;
  updateLayersPanel();
  attachDrawingEvents(canvas);
  drawLayers();
  return layer;
}

// 레이어 패널
function updateLayersPanel(){
  layersPanel.innerHTML='';
  layers.forEach(layer=>{
    const div = document.createElement('div');
    div.className='layer-item';
    div.innerHTML=`<span>${layer.name}</span>
    <input type="range" min="0" max="2" step="0.01" value="${layer.brightness}">
    <button>${layer.visible?'👁':'🚫'}</button>`;
    const range = div.querySelector('input');
    const btn = div.querySelector('button');
    range.addEventListener('input',()=>{ layer.brightness=parseFloat(range.value); drawLayers(); });
    btn.addEventListener('click',()=>{
      layer.visible=!layer.visible;
      btn.textContent = layer.visible?'👁':'🚫';
      drawLayers();
    });
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
function attachDrawingEvents(canvas){
  let drawing=false, lastX=0, lastY=0;
  function start(e){
    e.preventDefault();
    const pos = getPos(e);
    lastX=pos.x; lastY=pos.y;
    drawing=true;
    if(isFilling){
      fillCanvas(activeLayer.ctx,colorPicker.value);
      saveHistory();
      isFilling=false;
    }
  }
  function move(e){
    if(!drawing) return;
    const pos = getPos(e);
    const ctx = activeLayer.ctx;
    ctx.strokeStyle=colorPicker.value;
    ctx.lineWidth=brushSizeSelect.value;
    ctx.lineCap='round';
    ctx.beginPath();
    if(brushTypeSelect.value==='점선'){
      ctx.setLineDash([5,5]);
    } else {
      ctx.setLineDash([]);
    }
    if(brushTypeSelect.value==='사각'){
      ctx.rect(pos.x,pos.y,ctx.lineWidth,ctx.lineWidth);
      ctx.fillStyle=colorPicker.value;
      ctx.fill();
    } else if(brushTypeSelect.value==='그라데이션'){
      const grad = ctx.createLinearGradient(lastX,lastY,pos.x,pos.y);
      grad.addColorStop(0,colorPicker.value);
      grad.addColorStop(1,'white');
      ctx.strokeStyle=grad;
      ctx.moveTo(lastX,lastY);
      ctx.lineTo(pos.x,pos.y);
      ctx.stroke();
    } else {
      ctx.moveTo(lastX,lastY);
      ctx.lineTo(pos.x,pos.y);
      ctx.stroke();
    }
    lastX=pos.x; lastY=pos.y;
  }
  function end(){ if(drawing) saveHistory(); drawing=false; }

  canvas.addEventListener('mousedown',start);
  canvas.addEventListener('touchstart',start);
  canvas.addEventListener('mousemove',move);
  canvas.addEventListener('touchmove',move);
  canvas.addEventListener('mouseup',end);
  canvas.addEventListener('touchend',end);
}

// 좌표
function getPos(e){
  const rect = container.getBoundingClientRect();
  if(e.touches) e=e.touches[0];
  return {x:e.clientX-rect.left, y:e.clientY-rect.top};
}

// 페인트통
function fillCanvas(ctx,color){
  ctx.fillStyle=color;
  ctx.fillRect(0,0,ctx.canvas.width, ctx.canvas.height);
}

// 히스토리
function saveHistory(){
  const img = activeLayer.ctx.getImageData(0,0,activeLayer.canvas.width,activeLayer.canvas.height);
  history.push({layer:activeLayer,img});
  redoStack=[];
}

// 취소/되돌리기
undoBtn.addEventListener('click',()=>{
  if(history.length==0) return;
  const last = history.pop();
  redoStack.push({layer:last.layer,img:last.layer.ctx.getImageData(0,0,last.layer.canvas.width,last.layer.canvas.height)});
  last.layer.ctx.putImageData(last.img,0,0);
});
redoBtn.addEventListener('click',()=>{
  if(redoStack.length==0) return;
  const next = redoStack.pop();
  history.push({layer:next.layer,img:next.layer.ctx.getImageData(0,0,next.layer.canvas.width,next.layer.canvas.height)});
  next.layer.ctx.putImageData(next.img,0,0);
});

// 그림 저장
saveBtn.addEventListener('click',()=>{
  const link=document.createElement('a');
  link.download='drawing.png';
  const tmpCanvas=document.createElement('canvas');
  tmpCanvas.width=parseInt(canvasWidthInput.value);
  tmpCanvas.height=parseInt(canvasHeightInput.value);
  const tmpCtx=tmpCanvas.getContext('2d');
  layers.forEach(layer=>{
    if(layer.visible) tmpCtx.drawImage(layer.canvas,0,0);
  });
  link.href=tmpCanvas.toDataURL();
  link.click();
  addGallery(tmpCanvas.toDataURL());
});

// 갤러리
function addGallery(src){
  const img = document.createElement('img');
  img.src=src;
  img.className='gallery-item';
  img.addEventListener('click',()=>{ loadGalleryImage(src); });
  galleryPanel.appendChild(img);
}
function loadGalleryImage(src){
  const img = new Image();
  img.onload=()=>{ activeLayer.ctx.drawImage(img,0,0); saveHistory(); };
  img.src=src;
}

// 레이어 추가
addLayerBtn.addEventListener('click',()=>{ createLayer('Layer '+(layers.length+1)); });

// 캔버스 크기 조절
resizeCanvasBtn.addEventListener('click',()=>{
  const w=parseInt(canvasWidthInput.value);
  const h=parseInt(canvasHeightInput.value);
  layers.forEach(layer=>{
    const tmp=document.createElement('canvas');
    tmp.width=w; tmp.height=h;
    tmp.getContext('2d').drawImage(layer.canvas,0,0);
    layer.canvas.width=w; layer.canvas.height=h;
    layer.ctx.drawImage(tmp,0,0);
  });
});

// 줌: 마우스 드래그 Ctrl + 터치 핀치
let lastZoomDist=0;
container.addEventListener('wheel', e=>{
  if(e.ctrlKey){
    e.preventDefault();
    scaleFactor += e.deltaY * -0.001;
    if(scaleFactor<0.1) scaleFactor=0.1;
    if(scaleFactor>5) scaleFactor=5;
    drawLayers();
  }
});
container.addEventListener('touchmove', e=>{
  if(e.touches.length==2){
    e.preventDefault();
    const dist = Math.hypot(
      e.touches[0].clientX-e.touches[1].clientX,
      e.touches[0].clientY-e.touches[1].clientY
    );
    if(lastZoomDist) scaleFactor *= dist/lastZoomDist;
    if(scaleFactor<0.1) scaleFactor=0.1;
    if(scaleFactor>5) scaleFactor=5;
    lastZoomDist=dist;
    drawLayers();
  }
});
container.addEventListener('touchend', e=>{
  if(e.touches.length<2) lastZoomDist=0;
});

// 이미지 삽입: 이전 모바일 지원 버전 그대로 적용 가능
imageInput.addEventListener('change', handleImageInsert);

function handleImageInsert(e){
  // ... 이전 삽입 + 드래그, 회전, 핀치 줌, 버튼 확정/취소 코드 동일
}

// 초기 레이어
createLayer('Layer 1');
