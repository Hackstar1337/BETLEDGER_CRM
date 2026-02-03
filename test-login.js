// Test login endpoint
const testLogin = async () => {
  try {
    const response = await fetch('http://localhost:3011/api/trpc/standaloneAuth.login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        0: {
          json: {
            username: 'admin',
            password: 'admin123'
          }
        }
      }),
      credentials: 'include'
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
    console.log('Set-Cookie header:', response.headers.get('set-cookie'));
  } catch (error) {
    console.error('Error:', error);
  }
};

testLogin();
