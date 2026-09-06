export type LanguageCode = "pt" | "en" | "es";

export interface FeatureTranslation {
  readonly title: string;
  readonly text: string;
}

export interface StepTranslation {
  readonly title: string;
  readonly text: string;
}

export interface AboutSectionTranslation {
  readonly title: string;
  readonly text: string;
}

export interface LocaleDictionary {
  readonly meta: {
    readonly siteDescription: string;
    readonly homeTitle: string;
    readonly aboutTitle: string;
    readonly aboutDescription: string;
    readonly uploadTitle: string;
    readonly uploadDescription: string;
    readonly viewTitle: string;
    readonly viewDescription: string;
  };
  readonly menu: {
    readonly navigation: string;
    readonly home: string;
    readonly about: string;
    readonly upload: string;
    readonly github: string;
    readonly language: string;
    readonly pt: string;
    readonly en: string;
    readonly es: string;
  };
  readonly common: {
    readonly copy: string;
    readonly copied: string;
    readonly copyError: string;
    readonly markdown: string;
  };
  readonly theme: {
    readonly toggle: string;
  };
  readonly home: {
    readonly eyebrow: string;
    readonly titleLead: string;
    readonly titleAccent: string;
    readonly lead: string;
    readonly copyInstall: string;
    readonly terminalLabel: string;
    readonly terminalGenerated: string;
    readonly terminalOpened: string;
    readonly terminalPrompt: string;
    readonly terminalReady: string;
    readonly proofLocalTitle: string;
    readonly proofLocalText: string;
    readonly proofSafeTitle: string;
    readonly proofSafeText: string;
    readonly proofRegistryTitle: string;
    readonly proofRegistryText: string;
    readonly resilienceEyebrow: string;
    readonly resilienceTitle: string;
    readonly resilienceLead: string;
    readonly features: readonly FeatureTranslation[];
    readonly flowEyebrow: string;
    readonly flowTitle: string;
    readonly steps: readonly StepTranslation[];
    readonly calloutTitle: string;
    readonly calloutText: string;
    readonly copyCommand: string;
  };
  readonly about: {
    readonly eyebrow: string;
    readonly title: string;
    readonly lead: string;
    readonly sections: readonly AboutSectionTranslation[];
    readonly guaranteeTitle: string;
    readonly guaranteeText: string;
    readonly limitationTitle: string;
    readonly limitationText: string;
    readonly repositoryTitle: string;
    readonly repositoryText: string;
    readonly repositoryAction: string;
  };
  readonly upload: {
    readonly eyebrow: string;
    readonly title: string;
    readonly lead: string;
    readonly limitTitle: string;
    readonly limitText: string;
    readonly fileLabel: string;
    readonly fileHint: string;
    readonly generateAction: string;
    readonly workingAction: string;
    readonly portableWarning: string;
    readonly resultTitle: string;
    readonly viewerUrlLabel: string;
    readonly copyViewerUrl: string;
    readonly openViewer: string;
    readonly fullLinkHiddenTitle: string;
    readonly fullLinkHiddenText: string;
    readonly partLinksTitle: string;
    readonly partLinksText: string;
    readonly partLinkLabel: string;
    readonly partLabel: string;
    readonly partSize: string;
    readonly copyPartUrl: string;
    readonly openPart: string;
    readonly aiPromptTitle: string;
    readonly aiPromptText: string;
    readonly aiPromptLabel: string;
    readonly copyAiPrompt: string;
    readonly splittingTitle: string;
    readonly splittingText: string;
    readonly skillTipsTitle: string;
    readonly skillTips: readonly string[];
    readonly errors: {
      readonly fileRequired: string;
      readonly fileTooLarge: string;
      readonly invalidFile: string;
      readonly unexpected: string;
    };
  };
  readonly document: {
    readonly publishedOn: string;
    readonly identifier: string;
    readonly actionsLabel: string;
    readonly copyFullUrl: string;
    readonly openRaw: string;
    readonly machineNote: string;
    readonly repositoryLabel: string;
    readonly recoveredLabel: string;
    readonly loadingTitle: string;
    readonly loadingText: string;
    readonly missingTitle: string;
    readonly missingText: string;
    readonly backHome: string;
    readonly editAction: string;
    readonly closeEditor: string;
    readonly editorTitle: string;
    readonly nameLabel: string;
    readonly contentLabel: string;
    readonly updateUrl: string;
    readonly updatedNotice: string;
    readonly byteCount: string;
    readonly validationError: string;
  };
  readonly footer: string;
}
