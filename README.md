# Submitting a Template to the Community Template Gallery

The process to submit a new template to the Community Template Gallery involves four main steps:

1. [Prepare your template](#1-prepare-your-template)
   - [1.1 Build your template](#11-build-your-template)
   - [1.2 Accept the Terms of Service](#12-accept-the-terms-of-service)
   - [1.3 Update the template metadata](#13-update-the-template-metadata)
2. [Prepare your project files](#2-prepare-your-project-files)
3. [Upload your files to GitHub](#3-upload-your-files-to-github)
4. [Submit your template](#4-submit-your-template)

*You can view the official documentation here: [developers.google.com/tag-platform/tag-manager/templates/gallery](https://developers.google.com/tag-platform/tag-manager/templates/gallery)*

## 1. Prepare your template

### 1.1 Build your template

Build your template in Google Tag Manager as a custom template. Before submitting, make sure that:

- The template has been thoroughly tested.
- The template content follows the [Style Guide](https://developers.google.com/tag-platform/tag-manager/templates/style).
- There is a plan in place for maintaining and updating the template in the future.

### 1.2 Accept the Terms of Service

Every new template submission must agree to the Terms of Service.

1. Read the [Google Tag Manager Community Template Gallery Terms of Service](https://developers.google.com/tag-platform/tag-manager/templates/gallery-tos).
2. In the Template Editor, open your template for editing.
3. Under the **Info** tab, check the box labelled **Agree to the Community Template Gallery Terms of Service**.

   <img width="456" height="481" alt="Agree to the Community Template Gallery Terms of Service checkbox" src="https://github.com/user-attachments/assets/9ddfc0da-e642-4eeb-924f-da145159c9cc" />

### 1.3 Update the template metadata

Before exporting the template, add the brand name and template categories to the template metadata.

1. In the Template Editor, click the three-dot menu in the top right corner and select **Show Advanced Settings**.

   <img width="206" height="308" alt="Show Advanced Settings menu option" src="https://github.com/user-attachments/assets/8c24e1cc-eca3-402d-8fe5-bf3bf87084b2" />

2. Go to the **Info** tab and enter **Comprend** in the **Brand name** field.

   <img width="419" height="81" alt="Brand name field" src="https://github.com/user-attachments/assets/7138b8c5-44b3-4b1a-bf7c-890f2abc2bcc" />

3. In the **Info** tab, click the **Source** toggle to show the template metadata as JSON.

   <img width="440" height="383" alt="Source toggle showing template metadata as JSON" src="https://github.com/user-attachments/assets/0e33cb20-9542-496b-a618-4e278d696f97" />

4. Add a `categories` field to the JSON object. Place it directly below the `displayName` field. The value must be an array.

    ```json
      "displayName": "Untitled Template",
      "categories": [],
    ```

5. Provide at least one category value from the [supported category table](https://developers.google.com/tag-platform/tag-manager/templates/gallery#add_categories_to_templatetpl). If more than one category applies, provide up to three values, ordered from most to least relevant. For example:
   
    ```json
      "displayName": "Untitled Template",
      "categories": [
        "ANALYTICS",
        "MARKETING",
        "EMAIL_MARKETING"
      ],
    ```

## 2. Prepare your project files

Each template repository must contain the following files at the root level:

| File            | Required | Notes                                                                                   |
| --------------- | -------- | --------------------------------------------------------------------------------------- |
| `template.tpl`  | Yes      | The exported template, including the `categories` entry.                                 |
| `metadata.yaml` | Yes      | Homepage, documentation link and version history.                                       |
| `LICENSE`       | Yes      | Filename in upper case. Contents must be the Apache 2.0 licence and nothing else. At the bottom of the file there is a line that says "Copyright 2026 Comprend". If needed, update the year.       |
| `README.md`     | No       | Recommended. Remember to update the your file to remove this tutorial.                                                                            |

Each update to the `template.tpl` file needs to be documented with a version change in `metadata.yaml`. This includes the initial release. Follow the steps below to update your `metadata.yaml` file for initial release.

1. Export your Google Tag Manager template and place it in the root of your project. The file must be named `template.tpl`.
2. Commit the file.
3. Copy the commit SHA of that commit and paste it as the `sha` value under `versions` in `metadata.yaml`. The SHA must reference the commit containing the `template.tpl` you want to publish.
4. Update the remaining placeholder values in `metadata.yaml` with values for your repository, including `homepage`, `documentation` and `changeNotes`.

    ```yaml
      homepage: "https://www.example.com"
      documentation: "https://www.example.com/documentation"
      versions:
        - sha: 5f02a788b90ae804f86b04aa24af8937e567874a
          changeNotes: Initial release.
    ```

5. Commit the changes.

## 3. Upload your files to GitHub

> [!IMPORTANT]
> Since GTM templates are public and each gallery entry links to the **Issues** section of the repository so users can report bugs, make sure that:
> - The repository visibility is set to **Public**.
> - Issues are **enabled** and open to the public.
> - Email notifications are **enabled** (so you are notified of any issues raised during template review).

## 4. Submit your template

1. Make sure you are signed in to GitHub with an account that has access to the template repository.
2. Go to the [Community Template Gallery submission page](https://tagmanager.google.com/gallery/getting-started).
4. Enter the **Repository URL** in the field provided and click **Submit**.
