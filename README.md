To set up **Cloud Endpoints** in front of your **Node.js backend on Cloud Run** and validate **Firebase JWT tokens** from your **Next.js frontend hosted on Firebase**, follow these step-by-step instructions.

---

### 🧭 **Overview of What You’ll Do**

1. **Prepare your OpenAPI spec for Cloud Endpoints**
2. **Enable Cloud Endpoints & ESPv2**
3. **Deploy OpenAPI spec to create the Cloud Endpoint**
4. **Deploy your backend with ESPv2 as a proxy**
5. **Configure Firebase to send JWTs**
6. **Test & Secure**

---

## ✅ STEP-BY-STEP GUIDE

---

### 🔧 **1. Enable required APIs**

Enable the following Google Cloud APIs:

```bash
gcloud services enable endpoints.googleapis.com
gcloud services enable servicemanagement.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

---

### 📄 **2. Create OpenAPI spec (e.g., `openapi.yaml`)**

Here is a minimal **OpenAPI spec** that:

* Sets up the endpoint
* Tells ESPv2 to validate Firebase JWT tokens

```yaml
swagger: '2.0'
info:
  title: my-api
  description: Cloud Endpoints for Node.js backend on Cloud Run
  version: 1.0.0
host: YOUR_PROJECT_ID.cloud.goog

x-google-endpoints:
- name: YOUR_PROJECT_ID.cloud.goog
  allowCors: true

x-google-backend:
  address: https://YOUR_CLOUD_RUN_URL

securityDefinitions:
  firebase:
    authorizationUrl: ""
    flow: "implicit"
    type: "oauth2"
    x-google-issuer: "https://securetoken.google.com/YOUR_FIREBASE_PROJECT_ID"
    x-google-jwks_uri: "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
    x-google-audiences: "YOUR_FIREBASE_PROJECT_ID"

paths:
  /your-api-route:
    get:
      security:
        - firebase: []
      responses:
        '200':
          description: A successful response
```

#### Replace:

* `YOUR_PROJECT_ID` with your Google Cloud project ID
* `YOUR_CLOUD_RUN_URL` with your deployed Cloud Run backend URL
* `YOUR_FIREBASE_PROJECT_ID` with your Firebase project ID
* `/your-api-route` with an actual route your API handles

---

### ☁️ **3. Deploy the API config to Cloud Endpoints**

Use `gcloud` to deploy the spec:

```bash
gcloud endpoints services deploy openapi.yaml
```

It will return a **service name** like:

```
Service Configuration: [your-project-id].cloud.goog
```

Note it.

---

### 🐳 **4. Deploy Cloud Run backend with ESPv2 (Extensible Service Proxy)**

You now need to deploy ESPv2 in front of your Node.js service using a **sidecar pattern** or as a **proxy** container.

The simplest way is to use ESPv2 as the main container in Cloud Run:

#### 4.1 Create a custom Dockerfile for ESPv2

Create a `Dockerfile` like this:

```Dockerfile
FROM gcr.io/endpoints-release/espv2:latest

ARG SERVICE_NAME
ARG SERVICE_CONFIG_ID
ARG BACKEND

ENTRYPOINT ["/espv2", \
  "--listener_port=8080", \
  "--backend=${BACKEND}", \
  "--service=${SERVICE_NAME}", \
  "--rollout_strategy=managed"]
```

Create a `cloudbuild.yaml` to build & deploy:

```yaml
steps:
- name: 'gcr.io/cloud-builders/docker'
  args: [
    'build',
    '-t', 'gcr.io/$PROJECT_ID/my-espv2-backend',
    '--build-arg', 'SERVICE_NAME=YOUR_PROJECT_ID.cloud.goog',
    '--build-arg', 'BACKEND=https://YOUR_CLOUD_RUN_URL',
    '.'
  ]

- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  args:
    [
      'run', 'deploy', 'my-espv2-backend',
      '--image', 'gcr.io/$PROJECT_ID/my-espv2-backend',
      '--platform', 'managed',
      '--region', 'YOUR_REGION',
      '--allow-unauthenticated'
    ]
```

Run it with:

```bash
gcloud builds submit --config cloudbuild.yaml
```

> 📝 You can also use Docker locally and deploy with `gcloud run deploy` if preferred.

---

### 🔐 **5. Configure Firebase to Send JWT**

In your Firebase-hosted frontend, when a user logs in with Firebase Auth (e.g., Google, Email/Password), get the **ID token** and attach it in the `Authorization` header.

#### Example (Client Side)

```js
const user = firebase.auth().currentUser;
if (user) {
  const token = await user.getIdToken();
  const response = await fetch('https://YOUR_PROJECT_ID.cloud.goog/your-api-route', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
```

---

### 🧪 **6. Test the Endpoint**

* Try accessing the endpoint **without token** → should be denied (`401`)
* Try accessing with **Firebase ID token** → should be allowed (`200`)

---

### 🔒 **7. (Optional) Restrict access to only Cloud Endpoints**

You can restrict your original backend Cloud Run service to **only be accessed by ESPv2** using [Cloud IAM and authentication](https://cloud.google.com/run/docs/securing/authenticating).

---

## ✅ Summary

| Step | Task                                          |
| ---- | --------------------------------------------- |
| 1    | Enable APIs                                   |
| 2    | Create OpenAPI spec                           |
| 3    | Deploy spec to Endpoints                      |
| 4    | Deploy Cloud Run with ESPv2 proxy             |
| 5    | Configure frontend to send Firebase ID tokens |
| 6    | Test JWT validation                           |
| 7    | (Optional) Lock backend to ESPv2 only         |

---

Would you like me to generate a full working sample with the OpenAPI spec and Dockerfile based on your values?
