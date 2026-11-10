import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  /** Primary actions of the view (one primary button at most). */
  actions?: ReactNode;
  eyebrow?: string;
}

/** Title block of a page: the h1 (focus target on navigation), a short description and the page actions. */
export function PageHeader({ title, description, actions, eyebrow }: Props) {
  return (
    <header className="pageHeader">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 id="page-title" tabIndex={-1}>
          {title}
        </h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="pageActions">{actions}</div> : null}
    </header>
  );
}
