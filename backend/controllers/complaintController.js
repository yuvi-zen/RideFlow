/**
 * Complaint Controller
 */

const { validationResult } = require('express-validator');
const { successResponse, errorResponse, validationErrorResponse } = require('../utils/apiResponse');
const complaintModel = require('../models/complaintModel');
const { USER_ROLES } = require('../config/constants');

async function createComplaint(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationErrorResponse(res, errors.array());

    const { ride_id, complaint_category, description } = req.body;
    const complaint = await complaintModel.createComplaint({
      ride_id, complainant_id: req.user.id, complaint_category, description
    });
    return successResponse(res, complaint, 'Complaint filed', 201);
  } catch (error) {
    next(error);
  }
}

async function getComplaint(req, res, next) {
  try {
    const complaint = await complaintModel.findById(req.params.id);
    if (!complaint) return errorResponse(res, 'Complaint not found', 404);
    return successResponse(res, complaint, 'Complaint retrieved', 200);
  } catch (error) {
    next(error);
  }
}

async function listComplaints(req, res, next) {
  try {
    const { status, limit = 20, offset = 0 } = req.query;
    let filters = { status, limit: parseInt(limit), offset: parseInt(offset) };
    if (req.user.role !== USER_ROLES.ADMIN) {
      filters.complainant_id = req.user.id;
    }
    const complaints = await complaintModel.getComplaints(filters);
    return successResponse(res, complaints, 'Complaints retrieved', 200);
  } catch (error) {
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationErrorResponse(res, errors.array());

    const { status, resolution } = req.body;
    const complaint = await complaintModel.findById(req.params.id);
    if (!complaint) return errorResponse(res, 'Complaint not found', 404);

    const updated = await complaintModel.updateStatus(req.params.id, status, resolution);
    return successResponse(res, updated, 'Complaint updated', 200);
  } catch (error) {
    next(error);
  }
}

async function deleteComplaint(req, res, next) {
  try {
    const complaint = await complaintModel.findById(req.params.id);
    if (!complaint) return errorResponse(res, 'Complaint not found', 404);
    if (req.user.id !== complaint.complainant_id) return errorResponse(res, 'Unauthorized', 403);
    await complaintModel.deleteComplaint(req.params.id);
    return successResponse(res, null, 'Complaint deleted', 200);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createComplaint, getComplaint, listComplaints, updateStatus, deleteComplaint
};
