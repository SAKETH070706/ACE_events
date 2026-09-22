import "./Welcome.css";

import Button from "../../ui/Button/Button";

function Welcome({ onCreate }) {

      const hour = new Date().getHours();

let greeting = "Good Evening";

if (hour < 12) {
    greeting = "Good Morning";
} else if (hour < 17) {
    greeting = "Good Afternoon";
}
    return(

        <div className="welcome">

            <div>
              <h1>{greeting} 👋</h1>

                <p>

                    Manage your certificate automation workflows.

                </p>

            </div>

            <Button onClick={onCreate}>

                + Create Event

            </Button>

        </div>

    )

}

export default Welcome;