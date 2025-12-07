
const router = require("express").Router();
const bodyparser = require("body-parser");
const ShowAllCasessController = require('../controller/ShowAllCasesscontroller');
const check = require("express-validator").check

const { protect, authorize } = require('./middleware/authMiddleware');

// جلب جميع الحالات 
router.get('/', ShowAllCasessController.getAllCases); //done done

// إضافة طلب حالة (مستخدم مسجل)
router.post('/',
    [
  check('title').notEmpty().withMessage('العنوان مطلوب'),
  check('type').isIn(['health', 'education', 'living', 'orphans', 'Emergency']).withMessage('نوع غير صالح'),
  check('total').isNumeric().withMessage('المبلغ الكلي يجب أن يكون رقماً'),
  check('deadline').isISO8601().withMessage('تاريخ غير صالح'),
  check('description').notEmpty().withMessage('الوصف مطلوب')
]
    ,protect, authorize('donor' , 'admin', 'needy'), ShowAllCasessController.createCase); //done done


router.get('/:id', protect, authorize('admin') , ShowAllCasessController.getCaseById); //done done

// // موافقة على الحالة (أدمن فقط)
router.put('/:id/approve',  protect, authorize('admin'), ShowAllCasessController.approveCase); //done done
// // حذف حالة  (أدمن فقط)
router.delete('/:id/delete',  protect, authorize('admin'), ShowAllCasessController.deleteCase);// done done
// // رفض حالة  (أدمن فقط)
router.put('/:id/reject',  protect, authorize('admin'), ShowAllCasessController.rejectCase );// done done



//كل الحالات الخاصة بمستخدم معيّن
router.get('/user/cases', protect,authorize('donor' , 'admin', 'needy'), ShowAllCasessController.getUserCases); // done done


module.exports = router;
