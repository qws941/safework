import { Hono } from 'hono';
import { Env } from '../index';

export const surveyDataRoutes = new Hono<{ Bindings: Env }>();

// List all surveys from KV
surveyDataRoutes.get('/list', async (c) => {
  try {
    const env = c.env as { SAFEWORK_KV?: KVNamespace };

    if (env.SAFEWORK_KV) {
      // KV에서 목록 가져오기
      const list = await env.SAFEWORK_KV.list({ limit: 100 });

      // 각 항목의 메타데이터 포함
      const surveys = list.keys.map(key => ({
        id: key.name,
        metadata: key.metadata || {},
        expiration: key.expiration
      }));

      return c.json({
        success: true,
        count: surveys.length,
        surveys
      });
    } else {
      return c.json({
        success: false,
        message: 'KV storage not configured'
      });
    }
  } catch (error) {
    console.error('Survey list error:', error);
    return c.json({
      success: false,
      error: '목록 조회 중 오류가 발생했습니다'
    }, 500);
  }
});

// Get specific survey
surveyDataRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const env = c.env as { SAFEWORK_KV?: KVNamespace };

    if (env.SAFEWORK_KV) {
      const data = await env.SAFEWORK_KV.get(id);

      if (data) {
        return c.json({
          success: true,
          data: JSON.parse(data)
        });
      } else {
        return c.json({
          success: false,
          message: '설문을 찾을 수 없습니다'
        }, 404);
      }
    } else {
      return c.json({
        success: false,
        message: 'KV storage not configured'
      });
    }
  } catch (error) {
    console.error('Survey get error:', error);
    return c.json({
      success: false,
      error: '조회 중 오류가 발생했습니다'
    }, 500);
  }
});

export default surveyDataRoutes;