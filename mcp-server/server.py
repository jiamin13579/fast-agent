from flask import Flask, request, jsonify
import subprocess
import json

app = Flask(__name__)

@app.route('/execute', methods=['POST'])
def execute():
    """Execute MCP tool command"""
    try:
        data = request.json
        tool = data.get('tool')
        params = data.get('params', {})

        if tool == 'exec':
            cmd = params.get('cmd', '')
            server = params.get('server', 'default')

            # Execute command (in production, this would connect to specific server)
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )

            return jsonify({
                'success': True,
                'result': result.stdout,
                'error': result.stderr if result.returncode != 0 else None
            })

        elif tool == 'refresh':
            source = params.get('source', '')
            # Placeholder for data refresh logic
            return jsonify({
                'success': True,
                'result': f'Data source {source} refreshed successfully'
            })

        else:
            return jsonify({
                'success': False,
                'error': f'Unknown tool: {tool}'
            })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok'})

@app.route('/tools', methods=['GET'])
def list_tools():
    """List available tools"""
    return jsonify({
        'tools': [
            {'name': 'exec', 'description': 'Execute shell command on remote server'},
            {'name': 'refresh', 'description': 'Refresh data source'}
        ]
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9000, debug=True)