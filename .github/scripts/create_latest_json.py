#!/usr/bin/env python3
"""
Create latest.json for TimeTrackerEX release and upload to fixed TimeTrackerEX Release
"""
import json
import os
import re
import sys
import urllib.request
import urllib.parse
from pathlib import Path


def github_api_request(url, method='GET', data=None, token=None):
    """Make GitHub API request"""
    headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Actions-Script'
    }
    if token:
        headers['Authorization'] = f'token {token}'
    
    if data and isinstance(data, dict):
        data = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    
    req = urllib.request.Request(url, data=data, headers=headers)
    req.get_method = lambda: method
    
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.reason}", file=sys.stderr)
        if e.code == 404:
            return None
        raise


def upload_to_github_release(release_id, file_path, asset_name, token):
    """Upload file to GitHub Release"""
    upload_url = f"https://uploads.github.com/repos/askul/trylion-customer-tools/releases/{release_id}/assets"
    
    with open(file_path, 'rb') as f:
        file_data = f.read()
    
    params = urllib.parse.urlencode({'name': asset_name})
    headers = {
        'Authorization': f'token {token}',
        'Content-Type': 'application/json'
    }
    
    req = urllib.request.Request(f"{upload_url}?{params}", data=file_data, headers=headers)
    req.get_method = lambda: 'POST'
    
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"Upload failed - HTTP Error {e.code}: {e.reason}", file=sys.stderr)
        raise


def main():
    # Get GitHub token from environment
    github_token = os.environ.get('GITHUB_TOKEN')
    if not github_token:
        print('Error: GITHUB_TOKEN environment variable not set', file=sys.stderr)
        sys.exit(1)
    
    # Get version from pyproject.toml
    pj_path = Path('pyproject.toml')
    if not pj_path.exists():
        print(f"Error: {pj_path} not found", file=sys.stderr)
        sys.exit(1)
    
    with open(pj_path, 'r', encoding='utf-8') as f:
        pj_content = f.read()
    
    m = re.search(r"version\s*=\s*\"(.*?)\"", pj_content)
    if not m:
        print('Error: version not found in pyproject.toml', file=sys.stderr)
        sys.exit(1)
    
    version = m.group(1)
    tag = f"TimeTrackerEX-{version}"
    
    # Create latest.json content
    # latest.json is hosted at fixed tag "TimeTrackerEX", but points to versioned assets
    base_url = f"https://github.com/askul/trylion-customer-tools/releases/download/{tag}/"
    data = {
        "name": "at3",
        "version": version,
        "level": "system",
        "type": "app",
        "urls": [
            {
                "os": "win",
                "url": base_url + "app-win"
            },
            {
                "os": "mac", 
                "url": base_url + "app-mac"
            }
        ]
    }
    
    # Write latest.json
    output_path = Path('latest.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    
    print(f'Created {output_path} for version {version}')
    print(f'Tag: {tag}')
    
    # Upload to fixed TimeTrackerEX Release
    repo_api_url = "https://api.github.com/repos/askul/trylion-customer-tools"
    
    # Get or create the fixed TimeTrackerEX release
    release_url = f"{repo_api_url}/releases/tags/TimeTrackerEX"
    release_data = github_api_request(release_url, token=github_token)
    
    if not release_data:
        print("Fixed TimeTrackerEX release not found, creating it...")
        create_data = {
            "tag_name": "TimeTrackerEX",
            "name": "TimeTrackerEX",
            "body": "Latest version information for TimeTrackerEX",
            "draft": False,
            "prerelease": False
        }
        release_data = github_api_request(f"{repo_api_url}/releases", 
                                        method='POST', 
                                        data=create_data, 
                                        token=github_token)
    
    release_id = release_data['id']
    print(f"Using release ID: {release_id}")
    
    # Delete existing latest.json asset if it exists
    assets_url = f"{repo_api_url}/releases/{release_id}/assets"
    assets = github_api_request(assets_url, token=github_token)
    
    for asset in assets:
        if asset['name'] == 'latest.json':
            print(f"Deleting existing latest.json asset (ID: {asset['id']})...")
            delete_url = f"{repo_api_url}/releases/assets/{asset['id']}"
            github_api_request(delete_url, method='DELETE', token=github_token)
            break
    
    # Upload new latest.json
    print("Uploading latest.json to TimeTrackerEX release...")
    upload_result = upload_to_github_release(release_id, output_path, 'latest.json', github_token)
    print(f"Upload successful: {upload_result.get('browser_download_url', 'URL not available')}")


if __name__ == '__main__':
    main()
