import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  try {
    // 清除所有认证相关的cookie
    cookies.delete('session_token', { path: '/' });
    cookies.delete('user_id', { path: '/' });
    cookies.delete('user_email', { path: '/' });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Logout successful',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'An unexpected error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
