function setupMCPChat() {
  var toggleButton = document.getElementById('mcp-toggle-btn');
  var userInput = document.getElementById('mcp-prompt');
  var dropdown = document.getElementById('mcp-chat-dropdown');
  var messagesContainer = document.getElementById('mcp-chat-messages');
  var closeButton = document.querySelector('.mcp-chat-close');

  if (!dropdown) {
    return;
  }

  var isOpen = false;

  function openDropdown() {
    dropdown.classList.add('active');
    isOpen = true;
    if (!mcpSessionId) {
      initializeMCPSession(function (err) {
        if (err) {
          console.error('Error initializing MCP session:', err);
        }
      });
    }
    if (userInput) {
      setTimeout(function () {
        userInput.focus();
      }, 100);
    }
  }

  function closeDropdown() {
    dropdown.classList.remove('active');
    isOpen = false;
    mcpSessionId = null;
  }

  function toggleDropdown() {
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
      // Focus is handled in openDropdown()
    }
  }

  function userPrompt(role, text) {
    var messageDiv = document.createElement('div');
    messageDiv.className = 'mcp-prompt ' + role + '-prompt';

    var timestamp = new Date().toLocaleTimeString();
    var timestampDiv = document.createElement('div');
    timestampDiv.className = 'mcp-prompt-timestamp';
    timestampDiv.textContent = timestamp;

    var promptDiv = document.createElement('div');
    promptDiv.className = 'mcp-prompt-text';
    promptDiv.textContent = text;
    messageDiv.appendChild(timestampDiv);
    messageDiv.appendChild(promptDiv);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // MCP client state
  var mcpSessionId = null;
  var reqId = 0;
  function initializeMCPSession(callback) {
    if (mcpSessionId) {
      callback(null);
      return;
    }

    fetch('/experimental/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': getCSRFToken()
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: ++reqId,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'openQA Web UI',
            version: '1.0.0'
          }
        }
      })
    })
      .then(function (response) {
        mcpSessionId = response.headers.get('Mcp-Session-Id');
        console.log('MCP session ID:', mcpSessionId);
        return response.json();
      })
      .then(function (data) {
        if (data.result && mcpSessionId) {
          console.log('MCP session initialized:', data.result);
          callback(null);
        } else {
          callback(new Error('MCP initialization failed - no session ID'));
        }
      })
      .catch(function (error) {
        console.error('MCP initialization error:', error);
        callback(error);
      });
  }

  function callMCPTool(toolName, args, callback) {
    var requestBody = {
      jsonrpc: '2.0',
      id: ++reqId,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args || {}
      }
    };

    console.log('MCP Request:', requestBody);

    fetch('/experimental/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': getCSRFToken(),
        'Mcp-Session-Id': mcpSessionId
      },
      body: JSON.stringify(requestBody)
    })
      .then(function (response) {
        console.log('MCP Response status:', response.status);
        return response.json();
      })
      .then(function (data) {
        console.log('MCP Response data:', data);
        if (data.result) {
          callback(null, data.result);
        } else if (data.error) {
          var errorMsg = 'MCP Error: ' + (data.error.message || JSON.stringify(data.error));
          console.error(errorMsg, data.error);
          callback(new Error(errorMsg));
        } else {
          console.error('Unknown MCP response:', data);
          callback(new Error('Unknown MCP error'));
        }
      })
      .catch(function (error) {
        console.error('MCP tool call error:', error);
        callback(error);
      });
  }

  function getCurrentJobId() {
    var urlMatch = window.location.pathname.match(/\/tests\/(\d+)/);
    if (urlMatch) {
      return parseInt(urlMatch[1]);
    }

    var dependenciesPanel = document.getElementById('dependencies');
    if (dependenciesPanel && dependenciesPanel.dataset.currentJobId) {
      return parseInt(dependenciesPanel.dataset.currentJobId);
    }

    var jobElement = document.querySelector('[data-current-job-id]');
    if (jobElement && jobElement.dataset.currentJobId) {
      return parseInt(jobElement.dataset.currentJobId);
    }

    return null;
  }

    function handleMCPQuery(userQuery) {
        userPrompt('assistant', 'Thinking...');

        // assumed initialized
        var query = userQuery.toLowerCase();

        if (query.includes('info') || query.includes('server') || query.includes('worker')) {
            callMCPTool('openqa_get_info', {}, function (err, result) {
                if (err) {
                    userPrompt('assistant', 'Error: ' + err.message);
                } else {
                    var text = result.content[0].text;
                    userPrompt('assistant', text);
                }
            });
        } else if (query.match(/job\s+(\d+)/)) {
            var jobId = parseInt(query.match(/job\s+(\d+)/)[1]) || getCurrentJobId();
            if (!jobId) {
                userPrompt('assistant', 'Error: No job ID specified and could not detect current job from page.');
                return;
            }
            callMCPTool('openqa_get_job_info', { job_id: jobId }, function (err, result) {
                if (err) {
                    userPrompt('assistant', 'Error: ' + err.message);
                } else {
                    var text = result.content[0].text;
                    userPrompt('assistant', text);
                }
            });
        } else if (query.includes('log')) {
            var logMatch = query.match(/(?:job\s+)?(\d+)\s+log(?:\s+(\S+))?/);
            var jobId = logMatch ? parseInt(logMatch[1]) : getCurrentJobId();
            var fileName = (logMatch && logMatch[2]) || 'autoinst-log.txt';

            if (!jobId) {
                userPrompt('assistant', 'Error: No job ID specified and could not detect current job from page.');
                return;
            }

            callMCPTool('openqa_get_log_file', { job_id: jobId,  file_name: fileName }, function (err, result) {
                if (err) {
                    userPrompt('assistant', 'Error: ' + err.message);
                } else {
                    var text = result.content[0].text;
                    userPrompt('assistant', text);
                }
            });
        }  else {
      // Default response
      userPrompt(
        'assistant',
        'I can help you with:\n- "server info" - Get server information\n- "job 123" - Get information about job 123\n- "job 123 log" - Get log file for job 123\n- "log" - Get log from current job (if on job page)\n\nWhat would you like to know?'
      );
    }
  }

  userInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var userQuery = userInput.value.trim();

      if (userQuery) {
        console.log('User asked:', userQuery);
        userPrompt('user', userQuery);
        userInput.value = '';
        if (!isOpen) {
          openDropdown();
        }
        handleMCPQuery(userQuery);
      }
    }
  });

  if (toggleButton) {
    toggleButton.addEventListener('click', function () {
      toggleDropdown();
    });
  }

  if (closeButton) {
    closeButton.addEventListener('click', function () {
      closeDropdown();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) {
      closeDropdown();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === '`') {
      // Only if not typing input
      var activeElement = document.activeElement;
      var isTyping =
        activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable;

      if (!isTyping) {
        e.preventDefault();
        toggleDropdown();
      }
    }
  });

  console.log('MCP Chat initialized!');
}
