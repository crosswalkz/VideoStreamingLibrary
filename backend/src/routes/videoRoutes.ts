import { Router } from 'express';
import { upload, handleVideoUpload, handleUploadError, listVideos, getVideo, updateVideo, retryTranscode, discardVideo } from '../controllers/videoController';
import { validateVideoUpload, validateVideoUpdate } from '../middlewares';

const router = Router();

router.get('/', listVideos);
router.post('/upload', upload.single('video'), validateVideoUpload, handleVideoUpload);
router.post('/:id/retry', retryTranscode);
router.post('/:id/discard', discardVideo);
router.get('/:id', getVideo);
router.patch('/:id', validateVideoUpdate, updateVideo);

router.use(handleUploadError);

export default router;
