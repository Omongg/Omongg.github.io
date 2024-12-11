//변수 관리
let camera, scene, renderer, world;
let meshes = [], bodies = [];

// 페이지 콘텐츠 관리
function loadContent(page) {
    // Three.js 관련 정리
    if (renderer) {
        renderer.domElement.remove();  // 기존 캔버스 제거
        renderer = null;
    }
    if (world) {
        world = null;
    }
    meshes = [];
    bodies = [];
    
    // 페이지 전환
    if (page === 'works') {
        // works 페이지 표시
        document.getElementById('works').style.display = 'block';
        document.getElementById('about').style.display = 'none';
        init();  // Three.js 초기화
    } else if (page === 'about') {
        // about 페이지 표시
        document.getElementById('works').style.display = 'none';
        document.getElementById('about').style.display = 'block';
    } else {
        // 기본 페이지 
        document.getElementById('works').style.display = 'none';
        document.getElementById('about').style.display = 'none';
        
    }
}

// 라우팅 관리
function navigate(event, page) {
    event.preventDefault();
    
    if (page === 'about') {
        history.pushState({ page: 'about' }, '', './about');
        loadContent('about');
    } else if (page === 'works') {
        history.pushState({ page: 'works' }, '', './works');
        loadContent('works');
    }
}

// 브라우저 뒤로가기/앞으로가기 처리
window.onpopstate = function(event) {
    if (event.state && event.state.page) {
        loadContent(event.state.page);
    }
};

// 초기 페이지 설정


//초기화 관리
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // Camera 설정
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100);
    camera.position.set(0, 0, 5);

    // Renderer 크기 조절
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth * 0.9, window.innerHeight * 0.7);
    document.getElementById('works').appendChild(renderer.domElement);

    // 물리 엔진 초기화
    world = new CANNON.World();
    world.gravity.set(0, 0, 0);
    world.defaultContactMaterial.restitution = 1.0;
    world.defaultContactMaterial.friction = 0.0;

    // 경계 벽 위치 조정 및 충돌 속성 개선
    const wallMaterial = new CANNON.Material('wall');
    const wallShape = new CANNON.Box(new CANNON.Vec3(5, 0.1, 5));
    
    // 상단 벽
    const topWall = new CANNON.Body({ 
        mass: 0,
        material: wallMaterial,
        position: new CANNON.Vec3(0, 2, 0)
    });
    topWall.addShape(wallShape);
    world.addBody(topWall);
    
    // 하단 벽
    const bottomWall = new CANNON.Body({ 
        mass: 0,
        material: wallMaterial,
        position: new CANNON.Vec3(0, -2, 0)
    });
    bottomWall.addShape(wallShape);
    world.addBody(bottomWall);
    
    // 좌측 벽
    const leftWall = new CANNON.Body({ 
        mass: 0,
        material: wallMaterial,
        position: new CANNON.Vec3(-2.8, 0, 0)
    });
    leftWall.addShape(new CANNON.Box(new CANNON.Vec3(0.1, 2, 5)));
    world.addBody(leftWall);
    
    // 우측 벽
    const rightWall = new CANNON.Body({ 
        mass: 0,
        material: wallMaterial,
        position: new CANNON.Vec3(2.8, 0, 0)
    });
    rightWall.addShape(new CANNON.Box(new CANNON.Vec3(0.1, 2, 5)));
    world.addBody(rightWall);

    // 조명
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 20, 10);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    addArtworks();

    // 마우스 이벤트 리스너
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);

    animate();
}
//작품 추가 관리
function addArtworks() {
    const artworks = [
        { 
            img: 'img/Delay.jpg', 
            title: 'Delay',
            video: 'videos/delay.mp4'  // 비디오 경로 추가
        },
        {
            img: 'img/chair.jpg',
            title: 'an unthinking chair',
            video: 'videos/2023_DIAF_Chair.mp4'
        },
        {
            img: 'img/Umpah.jpg',
            title: 'Umpah Umpah',
            video: 'videos/Umpah_Umpah.mp4'
        }
    ];

    const artworkMaterial = new CANNON.Material('artwork');
    
    const contactMaterial = new CANNON.ContactMaterial(
        artworkMaterial,
        world.defaultMaterial,
        {
            friction: 0.0,
            restitution: 0.8,
            contactEquationStiffness: 1e8,
            contactEquationRelaxation: 3
        }
    );
    world.addContactMaterial(contactMaterial);

    artworks.forEach((artwork, i) => {
        const texture = new THREE.TextureLoader().load(artwork.img);
        const material = new THREE.MeshPhongMaterial({ map: texture });
        const geometry = new THREE.PlaneGeometry(1, 1);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = Math.random() * 4 - 2;
        mesh.position.y = Math.random() * 2 - 1;
        
        // 메시에 비디오 URL 저장
        mesh.userData.video = artwork.video;
        
        scene.add(mesh);

        const body = new CANNON.Body({
            mass: 1,
            material: artworkMaterial,
            position: new CANNON.Vec3(mesh.position.x, mesh.position.y, 0),
            velocity: new CANNON.Vec3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                0
            ),
            angularDamping: 0.5,
            linearDamping: 0.2,
            fixedRotation: true
        });

        const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.1));
        body.addShape(shape);
        
        world.addBody(body);
        meshes.push(mesh);
        bodies.push(body);
    });
}

let isDragging = false;
let selectedBody = null;
let mouseConstraint = null;
let selectedMesh = null;
let clickStartTime = null;
//마우스 이벤트 관리
function onMouseDown(event) {
    const canvasBounds = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1,
        -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
        isDragging = true;
        const mesh = intersects[0].object;
        
        // 클릭 시작 시간 저장
        clickStartTime = Date.now();
        selectedMesh = mesh;
        
        const index = meshes.indexOf(mesh);
        selectedBody = bodies[index];

        const pointToLocal = selectedBody.position.vsub(new CANNON.Vec3(
            intersects[0].point.x,
            intersects[0].point.y,
            intersects[0].point.z
        ));

        mouseConstraint = new CANNON.PointToPointConstraint(
            selectedBody,
            pointToLocal,
            new CANNON.Body({ mass: 0 }),
            new CANNON.Vec3(0, 0, 0)
        );

        world.addConstraint(mouseConstraint);
    }
}
//마우스 이벤트 관리
function onMouseMove(event) {
    if (isDragging && mouseConstraint) {
        const canvasBounds = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1,
            -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1
        );

        const clampedX = Math.max(-2.5, Math.min(2.5, mouse.x * 3));
        const clampedY = Math.max(-1.8, Math.min(1.8, mouse.y * 3));
        
        mouseConstraint.pivotB.set(clampedX, clampedY, 0);
    }
}
//마우스 이벤트 관리
function onMouseUp(event) {
    if (isDragging && selectedMesh) {
        // 클릭 지속 시간 확인
        const clickDuration = Date.now() - clickStartTime;
        
        // 짧은 클릭(200ms 미만)이고 드래그가 거의 없었을 때 비디오 재생
        if (clickDuration < 200 && selectedMesh.userData.video) {
            const videoModal = document.getElementById('videoModal');
            const video = document.getElementById('artworkVideo');
            
            video.src = selectedMesh.userData.video;
            videoModal.style.display = 'block';
            video.play();
        }
    }
    
    isDragging = false;
    if (mouseConstraint) {
        world.removeConstraint(mouseConstraint);
        mouseConstraint = null;
        selectedBody = null;
    }
    selectedMesh = null;
}
//애니메이션 관리
function animate() {
    requestAnimationFrame(animate);

    world.step(1/60);

    for(let i = 0; i < bodies.length; i++) {
        meshes[i].position.copy(bodies[i].position);
        meshes[i].quaternion.copy(bodies[i].quaternion);
    }

    renderer.render(scene, camera);
}

//라우팅 관리
window.onpopstate = (event) => {
    const page = event.state?.page || '';
    loadContent(page);
};
//페이지 로드 관리
window.onload = () => {
    const path = window.location.pathname.slice(1);
    loadContent(path || '');
};
//화면 크기 관리
window.addEventListener('resize', () => {
    if (renderer && camera) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth * 0.9, window.innerHeight * 0.7);
    }
});

// 모달 닫기 버튼 이벤트
document.getElementById('closeModal').addEventListener('click', () => {
    const videoModal = document.getElementById('videoModal');
    const video = document.getElementById('artworkVideo');
    
    video.pause();
    video.src = '';
    videoModal.style.display = 'none';
});

const canvas = document.getElementById('pixel-art');
const ctx = canvas.getContext('2d');

// 픽셀 아트 데이터 (예시)
const pixelArt = [
    [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1],
    [1,0,0,1,0,0,1,0,0,1,0,0,1,1,1,1,0,1,0,1,0,0,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [0,1,1,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,1,1,0],
    [0,0,1,0,0,1,1,0,0,1,0,0,0,1,0,0,0,1,1,0,0,1,0,0],
    [0,0,1,0,1,0,1,1,0,1,0,0,0,1,0,0,1,0,1,1,0,1,0,0],
    [0,0,1,0,0,1,1,0,0,1,0,0,0,1,0,0,0,1,1,0,0,1,0,0],
    [0,0,1,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,1,0,0],
    [0,0,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0],
    [0,0,1,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0],
    [0,0,0,1,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,1,0],
    [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
    [0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
    [0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0],
    [0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0]
];


// 픽셀 크기
const pixelSize = 10;
// 픽셀 아트 그리기
/*
pixelArt.forEach((row, y) => {
    row.forEach((pixel, x) => {
        if (pixel === 1) {
            ctx.fillStyle = 'black'; // 픽셀 색상
            ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
    });
});*/
// 애니메이션을 위한 변수들
let animatedPixelsBlack = [
    {x: 5, y: 11},{x: 17, y:11}
]
let animatedPixelsWhite = [
    {x: 5, y: 10},{x: 6, y: 10},{x: 5, y: 12},{x: 6, y: 12},
    {x: 17, y: 10},{x: 18, y: 10},{x: 17, y: 12},{x: 18, y: 12}
]; // 애니메이션할 픽셀의 좌표
let isVisible = false;
let lastFrameTime = 0;

const BLINK_INTERVAL = 4000; // 깜박임 간격 (5초)
let blinkCount = 0; // 깜박임 횟수
let blinkDelay1 = 500
let blinkDelay2 = 300; // 깜박임 사이의 지연 시간 (밀리초)

// 픽셀 아트 그리기 함수 수정
function drawPixelArt(timestamp) {
    // 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 일반 픽셀 그리기
    pixelArt.forEach((row, y) => {
        row.forEach((pixel, x) => {
            if (pixel === 1) {
                ctx.fillStyle = 'black';
                ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            }
        });
    });
    
    // 애니메이션 픽셀 업데이트
    if (timestamp - lastFrameTime > BLINK_INTERVAL) {
        blinkCount = 0; // 깜박임 횟수 초기화
        lastFrameTime = timestamp; // 마지막 시간 업데이트
    }
    setTimeout(()=> {
        // 깜박임 애니메이션
        if (blinkCount < 2) {
            isVisible = true; // 눈 깜박임 상태
            blinkAnimate();
        } 
    },blinkDelay1);

   
    
    setTimeout(() => {
        requestAnimationFrame(drawPixelArt); // 다음 프레임 요청
    }, blinkDelay2);
}

function blinkAnimate(){
    ctx.fillStyle = 'white'; // 눈감는 애니메이션
    animatedPixelsWhite.forEach(pixel => {
        ctx.fillRect(pixel.x * pixelSize, pixel.y * pixelSize, pixelSize, pixelSize);
    });
    
    ctx.fillStyle = 'black';
    animatedPixelsBlack.forEach(pixel => {
        ctx.fillRect(pixel.x * pixelSize, pixel.y * pixelSize, pixelSize, pixelSize);
    });
    
    // 깜박임 횟수 증가
    if (isVisible) {
        blinkCount++;
    }
}

// 애니메이션 시작
requestAnimationFrame(drawPixelArt);






