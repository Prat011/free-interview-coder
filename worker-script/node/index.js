const { parentPort } = require('worker_threads');

// Handle messages from the main thread
parentPort.on('message', async (message) => {
  try {
    // Process the message based on its type
    switch (message.type) {
      case 'process':
        // Add your processing logic here
        const result = await processTask(message.data);
        parentPort.postMessage({ type: 'result', data: result });
        break;
      
      default:
        parentPort.postMessage({ 
          type: 'error', 
          error: `Unknown message type: ${message.type}` 
        });
    }
  } catch (error) {
    parentPort.postMessage({ 
      type: 'error', 
      error: error.message 
    });
  }
});

async function processTask(data) {
  // Add your task processing logic here
  return {
    status: 'success',
    result: `Processed: ${JSON.stringify(data)}`
  };
}

// Error handling for the worker
process.on('uncaughtException', (error) => {
  parentPort.postMessage({ 
    type: 'error', 
    error: `Uncaught Exception: ${error.message}` 
  });
});

process.on('unhandledRejection', (reason) => {
  parentPort.postMessage({ 
    type: 'error', 
    error: `Unhandled Rejection: ${reason}` 
  });
}); 