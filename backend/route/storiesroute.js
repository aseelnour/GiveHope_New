
/* stories Routes */


const router = require("express").Router();
const bodyparser = require("body-parser");
const storiesController = require('../controller/storiescontroller');
const check = require("express-validator").check

const { protect, authorize } = require('./middleware/authMiddleware');


router.get('/',   storiesController.getstories);//done

router.get('/stats', storiesController.getStats);  //  done

router.get('/:id' , storiesController.getStoryById);//done

 router.post('/' , protect,authorize('donor' , 'admin', 'needy'),  storiesController.createStory); //done
router.put('/:id/approve',  protect, authorize('admin')  , storiesController.approveStory);  // done 


router.get('/user/my-stories', protect, storiesController.getUserStories); //يجيب فقط قصصه done
router.get('/status/pending',  protect, authorize('admin') ,  storiesController.getPendingStories);//done يعرض للادمن فقط القصص الغير معتده لسا
router.delete('/user/:id',protect, authorize('needy' , 'donor'), storiesController.deleteUserStory);  // اليوزر يحذف قصته    done
router.delete('/admain/:id',  protect, authorize('admin')  ,storiesController.deleteAdminStory);  // حذف  قصة من الادمن   done



module.exports = router;


// ب صفحه المحتاج بنعرضله القصص تبعاته سواء كان موافق عليهم ام لا  ('/user/my-stories')
// , وبقدر يحذف فقط الي مش موافق عليهم ل هسا        ('/user/:id')


// ب صفحه الادمن بقدر يوافق ع القصه   ('/:id/approve')
// او يحذفها سواء قبل الموافقه او بعد    ('/admain/:id')
//  , عنده قائمه بالقصص الي لسا مش موافق عليهم ,  ('/pending')