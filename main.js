const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const textStatus = document.getElementById('textStatus');
const app = document.getElementById('app');
const emoji = document.getElementById('emoji');

// Start video
const startVideo = () => {
	if (navigator.mediaDevices === undefined) {
		navigator.mediaDevices = {};
	}

	if (navigator.mediaDevices.getUserMedia === undefined) {
		navigator.mediaDevices.getUserMedia = function (constraints) {
			var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
			if (!getUserMedia) {
				return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
			}
			return new Promise(function (resolve, reject) {
				getUserMedia.call(navigator, constraints, resolve, reject);
			});
		};
	}

	navigator.mediaDevices
		.getUserMedia({ video: { width: 1280, height: 720 } }) // Augmenter la résolution
		.then(function (stream) {
			if ('srcObject' in video) {
				video.srcObject = stream;
			} else {
				video.src = window.URL.createObjectURL(stream);
			}
			video.onloadedmetadata = function (e) {
				video.play();
			};
		})
		.catch(function (err) {
			console.log(err.name + ': ' + err.message);
		});
};

Promise.all([
	faceapi.nets.mtcnn.loadFromUri('./models'), // Utiliser un modèle plus précis
	faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
	faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
	faceapi.nets.faceExpressionNet.loadFromUri('./models')
]).then(startVideo);

let statusIcons = {
	default: { emoji: '😐', color: '#02c19c' },
	neutral: { emoji: '😐', color: '#54adad' },
	happy: { emoji: '😀', color: '#148f77' },
	sad: { emoji: '😥', color: '#767e7e' },
	angry: { emoji: '😠', color: '#b64518' },
	fearful: { emoji: '😨', color: '#90931d' },
	disgusted: { emoji: '🤢', color: '#1a8d1a' },
	surprised: { emoji: '😲', color: '#1230ce' },
};

video.addEventListener('play', () => {
	const displaySize = { width: video.width, height: video.height };
	faceapi.matchDimensions(canvas, displaySize);

	let previousStatus = 'default';
	let expressionScores = { neutral: 0, happy: 0, sad: 0, angry: 0, fearful: 0, disgusted: 0, surprised: 0 };

	setInterval(async () => {
		const detections = await faceapi.detectAllFaces(video, new faceapi.MtcnnOptions()).withFaceExpressions();
		const resizedDetections = faceapi.resizeResults(detections, displaySize);
		canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
		faceapi.draw.drawDetections(canvas, resizedDetections);
		faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

		if (detections.length > 0) {
			detections.forEach((element) => {
				let status = '';
				let valueStatus = 0.0;
				for (const [key, value] of Object.entries(element.expressions)) {
					if (value > valueStatus) {
						status = key;
						valueStatus = value;
					}
					expressionScores[key] = value; // Mettre à jour les scores d'expression
				}

				// Filtrer les détections de faible confiance
				if (valueStatus > 0.7) { // Ajuster le seuil selon vos besoins
					emoji.innerHTML = statusIcons[status].emoji;
					textStatus.innerHTML = `Tu as l'air ${status}`;
					app.style.backgroundColor = statusIcons[status].color;
					previousStatus = status;
				} else {
					emoji.innerHTML = statusIcons[previousStatus].emoji;
					textStatus.innerHTML = `Tu as l'air ${previousStatus}`;
					app.style.backgroundColor = statusIcons[previousStatus].color;
				}
			});
		} else {
			emoji.innerHTML = statusIcons['default'].emoji;
			textStatus.innerHTML = '...';
			app.style.backgroundColor = statusIcons['default'].color;
		}
	}, 100);
});
