import { Router } from 'express';
import tenantController from '../controllers/tenant.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireSuperAdmin } from '../middleware/authorization.middleware';

const router = Router();

// All tenant routes require Super Admin access
router.use(authenticate);
router.use(requireSuperAdmin);

/**
 * @route   GET /api/tenants
 * @desc    Get all tenants
 * @access  Super Admin only
 */
router.get('/', (req, res) => tenantController.getAllTenants(req, res));

/**
 * @route   GET /api/tenants/:id
 * @desc    Get single tenant by ID
 * @access  Super Admin only
 */
router.get('/:id', (req, res) => tenantController.getTenantById(req, res));

/**
 * @route   POST /api/tenants
 * @desc    Create new tenant
 * @access  Super Admin only
 */
router.post('/', (req, res) => tenantController.createTenant(req, res));

/**
 * @route   PUT /api/tenants/:id
 * @desc    Update tenant
 * @access  Super Admin only
 */
router.put('/:id', (req, res) => tenantController.updateTenant(req, res));

/**
 * @route   DELETE /api/tenants/:id
 * @desc    Delete tenant (soft delete)
 * @access  Super Admin only
 */
router.delete('/:id', (req, res) => tenantController.deleteTenant(req, res));

export default router;
