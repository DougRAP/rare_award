exports.handler = async (event) => {
  // In production, integrate your email service here (e.g., transactional API)
  return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Confirmation queued' }) };
};
