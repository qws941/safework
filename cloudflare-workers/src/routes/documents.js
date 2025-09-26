// Document management routes
export const documentRoutes = {
  // List documents
  list: async (request, env) => {
    try {
      const { keys } = await env.DOCUMENTS.list();
      const documents = [];

      for (const key of keys) {
        const metadata = await env.DOCUMENTS.get(key.name, { type: 'json' });
        if (metadata) {
          documents.push(metadata);
        }
      }

      return new Response(JSON.stringify({
        status: 'success',
        count: documents.length,
        data: documents
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        status: 'error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  // Get document
  get: async (request, { params }, env) => {
    try {
      const document = await env.DOCUMENTS.get(`doc_${params.id}`, { type: 'json' });

      if (!document) {
        return new Response(JSON.stringify({
          status: 'error',
          message: 'Document not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        status: 'success',
        data: document
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        status: 'error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  // Upload document
  upload: async (request, env) => {
    try {
      const formData = await request.formData();
      const file = formData.get('file');
      const title = formData.get('title') || 'Untitled';
      const description = formData.get('description') || '';

      if (!file) {
        return new Response(JSON.stringify({
          status: 'error',
          message: 'No file provided'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const id = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const document = {
        id,
        title,
        description,
        filename: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString()
      };

      // Store metadata
      await env.DOCUMENTS.put(id, JSON.stringify(document));

      // In a real app, you'd store the actual file in R2 or another storage service

      return new Response(JSON.stringify({
        status: 'success',
        message: 'Document uploaded successfully',
        data: document
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        status: 'error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  // Delete document
  delete: async (request, { params }, env) => {
    try {
      await env.DOCUMENTS.delete(`doc_${params.id}`);

      return new Response(JSON.stringify({
        status: 'success',
        message: 'Document deleted successfully'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        status: 'error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};