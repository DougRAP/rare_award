exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }
  try {
    const contentType = event.headers['content-type'] || '';
    let payload = {};
    if (contentType.includes('application/json')) {
      payload = JSON.parse(event.body || '{}');
    } else {
      // Fallback for multipart/form-data or x-www-form-urlencoded
      payload = { raw: event.body || '' };
    }

    // TODO: server-side validation could go here
    const ref = `RARE-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}-${String(Math.floor(Math.random()*10000)).padStart(4,'0')}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, referenceNumber: ref })
    };
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: e.message }) };
  }
};
