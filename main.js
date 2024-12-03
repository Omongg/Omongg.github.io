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
window.onload = function() {
    const path = window.location.pathname.slice(1);
    loadContent(path || '');
};

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
            title: '작품1',
            video: 'videos/delay.mp4'  // 비디오 경로 추가
        },
        
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
